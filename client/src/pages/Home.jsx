import React, { useState, useEffect } from 'react';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { background: '#fff', borderRadius: 16, padding: 40, width: '100%', maxWidth: 500, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#1a1a2e' },
  sub: { color: '#64748b', marginBottom: 32, fontSize: 15 },
  tabs: { display: 'flex', gap: 8, marginBottom: 28 },
  tab: (active) => ({ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
    background: active ? '#2563eb' : '#f1f5f9', color: active ? '#fff' : '#64748b' }),
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 15, marginBottom: 16, outline: 'none' },
  btn: (color) => ({ width: '100%', padding: '12px 0', background: color || '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 8 }),
};

const STORAGE_KEY = 'swot_mod_sessions';

function getSavedSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveModSession(data) {
  const sessions = getSavedSessions().filter(s => s.id !== data.id);
  sessions.unshift({ ...data, savedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 5)));
}

function removeSavedSession(id) {
  const sessions = getSavedSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export default function Home({ onJoin, identity }) {
  const [tab, setTab] = useState(identity?.isMod ? 'mod' : 'join');
  const [initials, setInitials] = useState('');
  const [sessionId, setSessionId] = useState(identity?.sessionId || '');
  const [modToken, setModToken] = useState(identity?.modToken || '');
  const [projName, setProjName] = useState('');
  const [projGoal, setProjGoal] = useState('');
  const [created, setCreated] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);

  useEffect(() => {
    setSavedSessions(getSavedSessions());
  }, []);

  const handleJoinParticipant = () => {
    if (!initials.trim() || initials.trim().length > 4) return alert('Введите инициалы (2-4 буквы)');
    if (!sessionId.trim()) return alert('Введите код сессии');
    onJoin({ sessionId: sessionId.trim().toUpperCase(), initials: initials.trim().toUpperCase(), isMod: false, modToken: null });
  };

  const handleJoinMod = () => {
    if (!sessionId.trim() || !modToken.trim()) return alert('Введите код сессии и токен модератора');
    onJoin({ sessionId: sessionId.trim().toUpperCase(), initials: 'МОД', isMod: true, modToken: modToken.trim() });
  };

  const handleCreate = async () => {
    if (!projName.trim() || !projGoal.trim()) return alert('Заполните название и цель');
    const res = await fetch('/api/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projName, goal: projGoal }),
    });
    const data = await res.json();
    // Save to localStorage immediately
    saveModSession({ id: data.id, modToken: data.modToken, name: projName, modUrl: data.modUrl });
    setSavedSessions(getSavedSessions());
    setCreated(data);
  };

  const restoreSession = (s) => {
    onJoin({ sessionId: s.id, initials: 'МОД', isMod: true, modToken: s.modToken });
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>SWOT Анализ</div>
        <div style={s.sub}>Стратегический анализ в реальном времени</div>

        {/* Saved sessions banner */}
        {savedSessions.length > 0 && (
          <div style={{ background: '#f5f3ff', border: '1.5px solid #c4b5fd', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', marginBottom: 8 }}>
              🔑 Ваши сохранённые сессии
            </div>
            {savedSessions.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid #ede9fe' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name || s.id}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    Код: <b>{s.id}</b> · {new Date(s.savedAt).toLocaleDateString('ru')}
                  </div>
                </div>
                <button onClick={() => restoreSession(s)}
                  style={{ padding: '5px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                  Войти
                </button>
                <button onClick={() => { removeSavedSession(s.id); setSavedSessions(getSavedSessions()); }}
                  style={{ padding: '5px 10px', background: '#f1f5f9', color: '#94a3b8', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={s.tabs}>
          <button style={s.tab(tab === 'join')} onClick={() => setTab('join')}>Участник</button>
          <button style={s.tab(tab === 'mod')} onClick={() => setTab('mod')}>Модератор</button>
          <button style={s.tab(tab === 'create')} onClick={() => setTab('create')}>Создать сессию</button>
        </div>

        {tab === 'join' && (
          <>
            <label style={s.label}>Ваши инициалы</label>
            <input style={s.input} placeholder="АБВ" maxLength={4} value={initials}
              onChange={e => setInitials(e.target.value.toUpperCase())} />
            <label style={s.label}>Код сессии</label>
            <input style={s.input} placeholder="ABCD1234" value={sessionId}
              onChange={e => setSessionId(e.target.value.toUpperCase())} />
            <button style={s.btn()} onClick={handleJoinParticipant}>Войти в сессию</button>
          </>
        )}

        {tab === 'mod' && (
          <>
            <label style={s.label}>Код сессии</label>
            <input style={s.input} placeholder="ABCD1234" value={sessionId}
              onChange={e => setSessionId(e.target.value.toUpperCase())} />
            <label style={s.label}>Токен модератора</label>
            <input style={s.input} placeholder="Токен из ссылки модератора" value={modToken}
              onChange={e => setModToken(e.target.value)} />
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: -10, marginBottom: 16 }}>
              Токен находится в URL после <code>?token=</code> — сохраните ссылку при создании сессии
            </div>
            <button style={s.btn('#7c3aed')} onClick={handleJoinMod}>Войти как модератор</button>
          </>
        )}

        {tab === 'create' && !created && (
          <>
            <label style={s.label}>Название проекта</label>
            <input style={s.input} placeholder="Стратегия банка 2025-2027" value={projName}
              onChange={e => setProjName(e.target.value)} />
            <label style={s.label}>Цель SWOT-анализа</label>
            <input style={s.input} placeholder="Разработать 3-летнюю стратегию развития" value={projGoal}
              onChange={e => setProjGoal(e.target.value)} />
            <button style={s.btn('#16a34a')} onClick={handleCreate}>Создать сессию</button>
          </>
        )}

        {tab === 'create' && created && (
          <div>
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: '#15803d' }}>Сессия создана!</div>
              <div style={{ marginBottom: 10 }}>
                <b>Код сессии:</b> <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3, fontFamily: 'monospace' }}>{created.id}</span>
              </div>
              <div style={{ marginBottom: 10, wordBreak: 'break-all', fontSize: 13 }}>
                <b>Участники:</b><br />
                <a href={created.participantUrl} style={{ color: '#16a34a' }}>{window.location.origin}{created.participantUrl}</a>
              </div>
              <div style={{ wordBreak: 'break-all', fontSize: 13, background: '#fff', border: '1px solid #86efac', borderRadius: 7, padding: '8px 12px' }}>
                <b>🔑 Ссылка модератора (сохраните!):</b><br />
                <a href={created.modUrl} style={{ color: '#7c3aed', wordBreak: 'break-all' }}>{window.location.origin}{created.modUrl}</a>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, background: '#fefce8', borderRadius: 7, padding: '8px 12px', border: '1px solid #fde047' }}>
              ✓ Ссылка модератора сохранена в браузере — при следующем входе на эту страницу она появится автоматически
            </div>
            <button style={s.btn('#7c3aed')} onClick={() => {
              onJoin({ sessionId: created.id, initials: 'МОД', isMod: true, modToken: created.modToken });
            }}>Открыть как модератор</button>
          </div>
        )}
      </div>
    </div>
  );
}
