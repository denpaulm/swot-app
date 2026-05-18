import React, { useState, useEffect } from 'react';

const Q_META = {
  S: { label: 'Сильные стороны', color: '#2563eb', bg: '#dbeafe' },
  W: { label: 'Слабые стороны', color: '#dc2626', bg: '#fee2e2' },
  O: { label: 'Возможности', color: '#16a34a', bg: '#dcfce7' },
  T: { label: 'Угрозы', color: '#d97706', bg: '#fef3c7' },
};

function calcAvg(scores, id) {
  const s = scores[id] || {};
  const complete = Object.values(s).filter(v => v.dim1 != null && v.dim2 != null);
  if (!complete.length) return 0;
  return complete.reduce((a, v) => a + (v.dim1 + v.dim2) / 2, 0) / complete.length;
}

export default function Stage4_TopSelection({ session, identity, emit, isMod }) {
  const [selected, setSelected] = useState({ S: [], W: [], O: [], T: [] });
  const [saved, setSaved] = useState(false);

  // Init from existing topTheses on mount
  useEffect(() => {
    const init = {};
    for (const q of ['S', 'W', 'O', 'T']) {
      init[q] = (session.topTheses[q] || []).map(t => t.id);
    }
    setSelected(init);
  }, []);

  const toggleThesis = (q, t) => {
    if (!isMod) return;
    setSaved(false);
    setSelected(prev => {
      const cur = prev[q];
      const next = cur.includes(t.id) ? cur.filter(id => id !== t.id) : [...cur, t.id];
      return { ...prev, [q]: next };
    });
  };

  const save = () => {
    const topTheses = {};
    for (const q of ['S', 'W', 'O', 'T']) {
      const sorted = getSorted(q);
      topTheses[q] = sorted.filter(t => selected[q].includes(t.id));
    }
    emit('mod:setTopTheses', { topTheses });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const getSorted = (q) => {
    return [...(session.theses[q] || [])].sort((a, b) => calcAvg(session.scores, b.id) - calcAvg(session.scores, a.id));
  };

  const selectTop = (q, n) => {
    if (!isMod) return;
    setSaved(false);
    const sorted = getSorted(q);
    setSelected(prev => ({ ...prev, [q]: sorted.slice(0, n).map(t => t.id) }));
  };

  const totalSelected = Object.values(selected).reduce((a, arr) => a + arr.length, 0);

  return (
    <div>
      {isMod && (
        <div style={{ background: '#ede9fe', borderRadius: 10, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: '#5b21b6' }}>
            Выберите тезисы для матрицы · Выбрано: <b>{totalSelected}</b> (рекомендуется 5–8 на квадрант)
          </span>
          <button onClick={save}
            style={{ marginLeft: 'auto', padding: '9px 28px', background: saved ? '#16a34a' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'background 0.2s' }}>
            {saved ? '✓ Сохранено!' : 'Сохранить отбор'}
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {['S', 'W', 'O', 'T'].map(q => {
          const { label, color, bg } = Q_META[q];
          const sorted = getSorted(q);
          const selCount = selected[q].length;

          return (
            <div key={q} style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ background: bg, padding: '12px 16px', borderBottom: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, color, fontSize: 15 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Выбрано: <b>{selCount}</b> из {sorted.length}
                  </div>
                </div>
                {isMod && (
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[5, 6, 7, 8].map(n => (
                      <button key={n} onClick={() => selectTop(q, n)}
                        style={{ padding: '4px 9px', fontSize: 11, background: selCount === n ? color : '#e2e8f0', color: selCount === n ? '#fff' : '#64748b', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                        ТОП{n}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {sorted.length === 0 && (
                  <div style={{ padding: '16px', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Тезисов нет</div>
                )}
                {sorted.map((t, idx) => {
                  const score = calcAvg(session.scores, t.id);
                  const isSelected = selected[q].includes(t.id);
                  const voteCount = Object.values(session.scores[t.id] || {}).filter(v => v.dim1 != null && v.dim2 != null).length;

                  return (
                    <div key={t.id} onClick={() => toggleThesis(q, t)}
                      style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12, alignItems: 'flex-start',
                        background: isSelected ? `${color}08` : '#fff',
                        cursor: isMod ? 'pointer' : 'default',
                        borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
                        transition: 'all 0.15s' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: isSelected ? color : '#e2e8f0',
                        color: isSelected ? '#fff' : '#94a3b8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {isSelected ? '✓' : idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, lineHeight: 1.4 }}>{t.text}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          {voteCount > 0
                            ? <>Оценок: {voteCount} · Средний балл: <b style={{ color }}>{score.toFixed(2)}</b></>
                            : <span style={{ color: '#94a3b8' }}>Оценок пока нет</span>
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
