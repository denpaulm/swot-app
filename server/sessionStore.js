// In-memory session storage
const sessions = new Map();

export function createSession({ name, goal, modToken }) {
  const session = {
    id: null, // set by caller
    name,
    goal,
    modToken,
    stage: 1,
    participants: [], // { initials, socketId }
    theses: { S: [], W: [], O: [], T: [] },
    // Each thesis: { id, text, authorInitials, quadrant, aiNote, merged: false }
    mergeProposals: [],
    // Each proposal: { id, ids: [], proposedText, status: 'pending'|'approved'|'rejected' }
    scores: {},
    // scores[thesisId][initials] = { dim1: number, dim2: number }
    topTheses: { S: [], W: [], O: [], T: [] },
    // Array of thesis ids selected for matrix
    matrix: {
      // SO[i][j] = true/false (S index i, O index j)
      SO: [], ST: [], WO: [], WT: []
    },
    actions: {},
    // actions[key] e.g. "SO_s1id_o2id" = [{ id, text, authorInitials, votes: [initials] }]
  };
  return session;
}

export function getSession(id) {
  return sessions.get(id);
}

export function saveSession(id, session) {
  sessions.set(id, { ...session, id });
}

export function deleteSession(id) {
  sessions.delete(id);
}

export function getAllSessions() {
  return Array.from(sessions.values());
}
