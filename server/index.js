import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createSession, getSession, saveSession } from './sessionStore.js';
import { validateThesis, findDuplicates, prefillMatrix } from './aiService.js';
import { generateExcel } from './excelExport.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(express.json());

// Serve built client
const clientDist = join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// ── REST: Create session ─────────────────────────────────────────────────────
app.post('/api/sessions', (req, res) => {
  const { name, goal } = req.body;
  if (!name || !goal) return res.status(400).json({ error: 'name and goal required' });
  const id = uuidv4().slice(0, 8).toUpperCase();
  const modToken = uuidv4().slice(0, 16);
  const session = createSession({ name, goal, modToken });
  saveSession(id, session);
  res.json({ id, modToken, participantUrl: `/session/${id}`, modUrl: `/session/${id}/mod?token=${modToken}` });
});

// ── REST: Get session (public info) ──────────────────────────────────────────
app.get('/api/sessions/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(sanitizeSession(session));
});

// ── REST: Export Excel ────────────────────────────────────────────────────────
app.get('/api/sessions/:id/export', (req, res) => {
  const { token } = req.query;
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  if (session.modToken !== token) return res.status(403).json({ error: 'Forbidden' });
  const buffer = generateExcel(session);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="swot-${session.id}.xlsx"`);
  res.send(buffer);
});

// ── SPA fallback ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

// ── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {

  // Join session
  socket.on('join', ({ sessionId, initials, modToken }) => {
    const session = getSession(sessionId);
    if (!session) return socket.emit('error', 'Session not found');

    const isMod = session.modToken === modToken;
    socket.join(sessionId);
    socket.data = { sessionId, initials, isMod };

    // Register participant
    if (!isMod && initials) {
      if (!session.participants.find(p => p.initials === initials)) {
        session.participants.push({ initials, socketId: socket.id });
        saveSession(sessionId, session);
      }
    }

    socket.emit('session:state', sanitizeSession(session));
    io.to(sessionId).emit('participants:update', session.participants.map(p => p.initials));
  });

  // ── STAGE 1: Add thesis ───────────────────────────────────────────────────
  socket.on('thesis:add', async ({ text, quadrant }) => {
    const { sessionId, initials } = socket.data;
    const session = getSession(sessionId);
    if (!session || session.stage !== 1) return;

    const id = uuidv4().slice(0, 8);
    const thesis = { id, text: text.trim(), quadrant, authorInitials: initials, aiNote: null, aiSuggestion: null };
    session.theses[quadrant].push(thesis);
    saveSession(sessionId, session);

    // Broadcast immediately, then validate async
    io.to(sessionId).emit('thesis:added', thesis);

    try {
      const validation = await validateThesis(text, quadrant);
      thesis.aiNote = validation.issue;
      thesis.aiSuggestion = validation.suggestion;
      thesis.aiValid = validation.valid !== false;
      saveSession(sessionId, session);
      // Always broadcast the AI result so all see it
      io.to(sessionId).emit('thesis:aiUpdate', {
        id,
        aiNote: validation.issue,
        aiSuggestion: validation.suggestion,
        aiValid: validation.valid !== false,
      });
    } catch (e) {
      console.error('AI validation error:', e.message);
    }
  });

  // Edit thesis text
  socket.on('thesis:edit', ({ id, text }) => {
    const { sessionId, initials, isMod } = socket.data;
    const session = getSession(sessionId);
    if (!session) return;
    for (const q of ['S', 'W', 'O', 'T']) {
      const t = session.theses[q].find(t => t.id === id);
      if (t && (t.authorInitials === initials || isMod)) {
        t.text = text.trim();
        t.aiNote = null;
        t.aiSuggestion = null;
        saveSession(sessionId, session);
        io.to(sessionId).emit('thesis:updated', t);
        return;
      }
    }
  });

  // Delete thesis
  socket.on('thesis:delete', ({ id }) => {
    const { sessionId, initials, isMod } = socket.data;
    const session = getSession(sessionId);
    if (!session) return;
    for (const q of ['S', 'W', 'O', 'T']) {
      const idx = session.theses[q].findIndex(t => t.id === id);
      if (idx !== -1) {
        const t = session.theses[q][idx];
        if (t.authorInitials === initials || isMod) {
          session.theses[q].splice(idx, 1);
          saveSession(sessionId, session);
          io.to(sessionId).emit('thesis:deleted', { id });
        }
        return;
      }
    }
  });

  // Mod approves/rejects merge proposal
  socket.on('merge:decide', ({ proposalId, action, editedText }) => {
    const { sessionId, isMod } = socket.data;
    if (!isMod) return;
    const session = getSession(sessionId);
    if (!session) return;

    const proposal = session.mergeProposals.find(p => p.id === proposalId);
    if (!proposal) return;

    if (action === 'approve') {
      proposal.status = 'approved';
      const finalText = editedText || proposal.proposedText;
      // Find quadrant of first id
      let targetQ = null;
      let firstThesis = null;
      for (const q of ['S', 'W', 'O', 'T']) {
        firstThesis = session.theses[q].find(t => t.ids ? false : proposal.ids.includes(t.id));
        if (firstThesis) { targetQ = q; break; }
      }
      if (targetQ) {
        // Replace first thesis with merged text, remove others
        const keep = proposal.ids[0];
        for (const q of ['S', 'W', 'O', 'T']) {
          session.theses[q] = session.theses[q].filter(t => !proposal.ids.includes(t.id) || t.id === keep);
          const t = session.theses[q].find(t => t.id === keep);
          if (t) { t.text = finalText; t.authorInitials = 'merged'; }
        }
      }
    } else {
      proposal.status = 'rejected';
    }

    saveSession(sessionId, session);
    io.to(sessionId).emit('session:state', sanitizeSession(session));
  });

  // ── STAGE control (mod only) ──────────────────────────────────────────────
  socket.on('mod:setStage', async ({ stage }) => {
    const { sessionId, isMod } = socket.data;
    if (!isMod) return;
    const session = getSession(sessionId);
    if (!session) return;

    session.stage = stage;

    // Auto-trigger duplicate detection when entering stage 2
    if (stage === 2) {
      saveSession(sessionId, session);
      io.to(sessionId).emit('session:stage', stage);
      io.to(sessionId).emit('ai:thinking', true);
      try {
        const allTheses = ['S', 'W', 'O', 'T'].flatMap(q => session.theses[q]);
        const proposals = await findDuplicates(allTheses);
        session.mergeProposals = proposals.map(p => ({ ...p, id: uuidv4().slice(0, 8), status: 'pending' }));
        saveSession(sessionId, session);
        io.to(sessionId).emit('mergeProposals:update', session.mergeProposals);
      } catch (e) {
        socket.emit('error', 'AI duplicates error: ' + e.message);
      }
      io.to(sessionId).emit('ai:thinking', false);
      return;
    }

    // Auto-trigger AI prefill when entering stage 5
    if (stage === 5) {
      saveSession(sessionId, session);
      io.to(sessionId).emit('session:stage', stage);
      socket.emit('ai:thinking', true);
      try {
        const matrix = await prefillMatrix({
          S: session.topTheses.S,
          W: session.topTheses.W,
          O: session.topTheses.O,
          T: session.topTheses.T,
        });
        session.matrix = matrix;
        saveSession(sessionId, session);
        io.to(sessionId).emit('matrix:update', session.matrix);
      } catch (e) {
        socket.emit('error', 'AI prefill error: ' + e.message);
      }
      socket.emit('ai:thinking', false);
      return;
    }

    saveSession(sessionId, session);
    io.to(sessionId).emit('session:stage', stage);
  });

  // ── STAGE 3: Submit score for one dimension ───────────────────────────────
  socket.on('score:submitDim', ({ thesisId, dim, val }) => {
    const { sessionId, initials } = socket.data;
    const session = getSession(sessionId);
    if (!session || session.stage !== 3) return;

    if (!session.scores[thesisId]) session.scores[thesisId] = {};
    if (!session.scores[thesisId][initials]) session.scores[thesisId][initials] = {};
    session.scores[thesisId][initials][dim] = val;
    saveSession(sessionId, session);
    // Broadcast the full score object for this person so UI can update
    io.to(sessionId).emit('score:update', {
      thesisId,
      initials,
      dim1: session.scores[thesisId][initials].dim1 ?? null,
      dim2: session.scores[thesisId][initials].dim2 ?? null,
    });
  });

  // ── STAGE 4: Mod selects top theses ──────────────────────────────────────
  socket.on('mod:setTopTheses', ({ topTheses }, ack) => {
    const { sessionId, isMod } = socket.data;
    if (!isMod) return;
    const session = getSession(sessionId);
    if (!session) return;
    session.topTheses = topTheses;
    saveSession(sessionId, session);
    io.to(sessionId).emit('topTheses:update', topTheses);
    if (typeof ack === 'function') ack({ ok: true });
  });

  // ── STAGE 5: Mod toggles matrix cell ─────────────────────────────────────
  socket.on('matrix:toggle', ({ matrixKey, row, col }) => {
    const { sessionId, isMod } = socket.data;
    if (!isMod) return;
    const session = getSession(sessionId);
    if (!session) return;

    if (!session.matrix[matrixKey]) return;
    if (!session.matrix[matrixKey][row]) session.matrix[matrixKey][row] = [];
    session.matrix[matrixKey][row][col] = !session.matrix[matrixKey][row][col];
    saveSession(sessionId, session);
    io.to(sessionId).emit('matrix:update', session.matrix);
  });

  // ── STAGE 6: Add action to intersection ──────────────────────────────────
  socket.on('action:add', ({ intersectionKey, text }) => {
    const { sessionId, initials } = socket.data;
    const session = getSession(sessionId);
    if (!session || session.stage !== 6) return;

    if (!session.actions[intersectionKey]) session.actions[intersectionKey] = [];
    const action = { id: uuidv4().slice(0, 8), text: text.trim(), authorInitials: initials, votes: [] };
    session.actions[intersectionKey].push(action);
    saveSession(sessionId, session);
    io.to(sessionId).emit('action:added', { intersectionKey, action });
  });

  socket.on('action:delete', ({ intersectionKey, actionId }) => {
    const { sessionId, initials } = socket.data;
    const session = getSession(sessionId);
    if (!session || session.stage !== 6) return;
    const acts = session.actions[intersectionKey];
    if (!acts) return;
    const idx = acts.findIndex(a => a.id === actionId && a.authorInitials === initials);
    if (idx === -1) return;
    acts.splice(idx, 1);
    saveSession(sessionId, session);
    io.to(sessionId).emit('action:deleted', { intersectionKey, actionId });
  });

  socket.on('action:update', ({ intersectionKey, actionId, text }) => {
    const { sessionId, initials } = socket.data;
    const session = getSession(sessionId);
    if (!session || session.stage !== 6) return;
    const acts = session.actions[intersectionKey];
    if (!acts) return;
    const action = acts.find(a => a.id === actionId && a.authorInitials === initials);
    if (!action) return;
    action.text = text.trim();
    saveSession(sessionId, session);
    io.to(sessionId).emit('action:updated', { intersectionKey, action });
  });

  // ── STAGE 7: Vote for action ──────────────────────────────────────────────
  socket.on('action:vote', ({ intersectionKey, actionId }) => {
    const { sessionId, initials } = socket.data;
    const session = getSession(sessionId);
    if (!session || session.stage !== 7) return;

    const acts = session.actions[intersectionKey];
    if (!acts) return;
    const action = acts.find(a => a.id === actionId);
    if (!action) return;

    const idx = action.votes.indexOf(initials);
    if (idx === -1) {
      action.votes.push(initials);
    } else {
      action.votes.splice(idx, 1); // toggle off
    }
    saveSession(sessionId, session);
    io.to(sessionId).emit('action:voteUpdate', { intersectionKey, actionId, votes: action.votes });
  });

  socket.on('disconnect', () => {
    const { sessionId, initials, isMod } = socket.data || {};
    if (!sessionId || isMod) return;
    const session = getSession(sessionId);
    if (!session) return;
    session.participants = session.participants.filter(p => p.initials !== initials);
    saveSession(sessionId, session);
    io.to(sessionId).emit('participants:update', session.participants.map(p => p.initials));
  });
});

function sanitizeSession(session) {
  return {
    id: session.id,
    name: session.name,
    goal: session.goal,
    stage: session.stage,
    participants: session.participants.map(p => p.initials),
    theses: session.theses,
    mergeProposals: session.mergeProposals,
    scores: session.scores,
    topTheses: session.topTheses,
    matrix: session.matrix,
    actions: session.actions,
  };
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`SWOT App running on port ${PORT}`));
