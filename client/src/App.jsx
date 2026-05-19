import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import Home from './pages/Home.jsx';
import SessionView from './pages/SessionView.jsx';

let socket = null;

export default function App() {
  const [page, setPage] = useState('home'); // 'home' | 'session'
  const [session, setSession] = useState(null);
  const [identity, setIdentity] = useState(null); // { initials, isMod, modToken, sessionId }
  const [connected, setConnected] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  // Parse URL on load
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/session\/([A-Z0-9]+)(\/mod)?$/);
    if (match) {
      const sessionId = match[1];
      const isMod = !!match[2];
      const params = new URLSearchParams(window.location.search);
      const modToken = params.get('token') || null;
      setPage('session');
      setIdentity({ sessionId, isMod, modToken, initials: null });
    }
  }, []);

  const connectSocket = useCallback((sessionId, initials, isMod, modToken) => {
    if (socket) socket.disconnect();
    socket = io({
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', { sessionId, initials, modToken });
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      // Socket.io will auto-reconnect; on reconnect 'connect' fires again → re-join
    });

    socket.on('connect_error', () => setConnected(false));

    socket.on('session:state', (s) => setSession(s));
    socket.on('session:stage', (stage) => setSession(prev => prev ? { ...prev, stage } : prev));

    socket.on('participants:update', (participants) =>
      setSession(prev => prev ? { ...prev, participants } : prev));

    socket.on('thesis:added', (thesis) =>
      setSession(prev => {
        if (!prev) return prev;
        const theses = { ...prev.theses };
        theses[thesis.quadrant] = [...(theses[thesis.quadrant] || []), thesis];
        return { ...prev, theses };
      }));

    socket.on('thesis:updated', (thesis) =>
      setSession(prev => {
        if (!prev) return prev;
        const theses = { ...prev.theses };
        theses[thesis.quadrant] = theses[thesis.quadrant].map(t => t.id === thesis.id ? thesis : t);
        return { ...prev, theses };
      }));

    socket.on('thesis:deleted', ({ id }) =>
      setSession(prev => {
        if (!prev) return prev;
        const theses = {};
        for (const q of ['S', 'W', 'O', 'T'])
          theses[q] = prev.theses[q].filter(t => t.id !== id);
        return { ...prev, theses };
      }));

    socket.on('thesis:aiUpdate', ({ id, aiNote, aiSuggestion, aiValid }) =>
      setSession(prev => {
        if (!prev) return prev;
        const theses = {};
        for (const q of ['S', 'W', 'O', 'T'])
          theses[q] = prev.theses[q].map(t => t.id === id ? { ...t, aiNote, aiSuggestion, aiValid } : t);
        return { ...prev, theses };
      }));

    socket.on('mergeProposals:update', (mergeProposals) =>
      setSession(prev => prev ? { ...prev, mergeProposals } : prev));

    socket.on('score:update', ({ thesisId, initials: who, dim1, dim2 }) =>
      setSession(prev => {
        if (!prev) return prev;
        const scores = { ...prev.scores };
        scores[thesisId] = { ...(scores[thesisId] || {}), [who]: { dim1, dim2 } };
        return { ...prev, scores };
      }));

    socket.on('topTheses:update', (topTheses) =>
      setSession(prev => prev ? { ...prev, topTheses } : prev));

    socket.on('matrix:update', (matrix) =>
      setSession(prev => prev ? { ...prev, matrix } : prev));

    socket.on('action:added', ({ intersectionKey, action }) =>
      setSession(prev => {
        if (!prev) return prev;
        const actions = { ...prev.actions };
        actions[intersectionKey] = [...(actions[intersectionKey] || []), action];
        return { ...prev, actions };
      }));

    socket.on('action:voteUpdate', ({ intersectionKey, actionId, votes }) =>
      setSession(prev => {
        if (!prev) return prev;
        const actions = { ...prev.actions };
        actions[intersectionKey] = (actions[intersectionKey] || []).map(a =>
          a.id === actionId ? { ...a, votes } : a);
        return { ...prev, actions };
      }));

    socket.on('ai:thinking', (v) => setAiThinking(v));
    socket.on('error', (msg) => alert('Ошибка: ' + msg));
  }, []);

  const handleJoin = useCallback(({ sessionId, initials, isMod, modToken }) => {
    setIdentity({ sessionId, initials, isMod, modToken });
    connectSocket(sessionId, initials, isMod, modToken);
    window.history.pushState({}, '', isMod ? `/session/${sessionId}/mod?token=${modToken}` : `/session/${sessionId}`);
    setPage('session');
  }, [connectSocket]);

  const emit = useCallback((event, data) => {
    if (socket) socket.emit(event, data);
  }, []);

  if (page === 'home' || !identity?.initials) {
    return <Home onJoin={handleJoin} identity={identity} />;
  }

  return (
    <SessionView
      session={session}
      identity={identity}
      emit={emit}
      connected={connected}
      aiThinking={aiThinking}
    />
  );
}
