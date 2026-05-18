import React from 'react';

const MATRICES = [
  { key: 'SO', rowQ: 'S', colQ: 'O', label: 'SO', color: '#2563eb', bg: '#dbeafe' },
  { key: 'ST', rowQ: 'S', colQ: 'T', label: 'ST', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'WO', rowQ: 'W', colQ: 'O', label: 'WO', color: '#16a34a', bg: '#dcfce7' },
  { key: 'WT', rowQ: 'W', colQ: 'T', label: 'WT', color: '#dc2626', bg: '#fee2e2' },
];

function calcAvg(scores, id) {
  const s = scores[id] || {};
  const vals = Object.values(s);
  if (!vals.length) return 0;
  const a1 = vals.reduce((a, v) => a + v.dim1, 0) / vals.length;
  const a2 = vals.reduce((a, v) => a + v.dim2, 0) / vals.length;
  return (a1 + a2) / 2;
}

export default function Stage7_Voting({ session, identity, emit }) {
  const { initials } = identity;

  const getAllIntersections = () => {
    const list = [];
    for (const { key, rowQ, colQ, label, color, bg } of MATRICES) {
      const rows = session.topTheses[rowQ] || [];
      const cols = session.topTheses[colQ] || [];
      const mat = session.matrix[key] || [];
      rows.forEach((r, i) => cols.forEach((c, j) => {
        if (!mat[i]?.[j]) return;
        const w = calcAvg(session.scores, r.id) * calcAvg(session.scores, c.id);
        const iKey = `${key}_${r.id}_${c.id}`;
        const acts = session.actions[iKey] || [];
        if (!acts.length) return;
        list.push({ key: iKey, matKey: label, rowText: r.text, colText: c.text, weight: w, color, bg, actions: acts });
      }));
    }
    return list.sort((a, b) => b.weight - a.weight);
  };

  const intersections = getAllIntersections();

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 20px', marginBottom: 20, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 14 }}>Проголосуйте за лучшие действия в каждом пересечении. Топ-5 по голосам войдут в итоговый план.</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {intersections.map(({ key, matKey, rowText, colText, weight, color, bg, actions }) => {
          const sorted = [...actions].sort((a, b) => b.votes.length - a.votes.length);
          const maxVotes = sorted[0]?.votes.length || 0;

          return (
            <div key={key} style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ background: bg, padding: '10px 16px', borderBottom: `2px solid ${color}`, display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ background: color, color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{matKey}</span>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <b>{rowText}</b> × {colText}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color }}>⚖ {weight.toFixed(1)}</div>
              </div>

              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sorted.map((action, rank) => {
                  const voted = action.votes.includes(initials);
                  const isTop = rank < 5;
                  return (
                    <div key={action.id}
                      style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 8,
                        background: isTop && maxVotes > 0 ? `${color}08` : '#fafafa',
                        border: `1px solid ${isTop && maxVotes > 0 ? color + '33' : '#e2e8f0'}` }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: rank < 3 && maxVotes > 0 ? color : '#e2e8f0',
                        color: rank < 3 && maxVotes > 0 ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {rank + 1}
                      </div>
                      <div style={{ flex: 1, fontSize: 13 }}>{action.text}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{action.authorInitials}</div>
                      {/* Vote bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <div style={{ width: 60, background: '#e2e8f0', borderRadius: 10, height: 6 }}>
                          <div style={{ width: maxVotes ? `${(action.votes.length / maxVotes) * 100}%` : '0%', background: color, height: 6, borderRadius: 10, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 16 }}>{action.votes.length}</span>
                        <button onClick={() => emit('action:vote', { intersectionKey: key, actionId: action.id })}
                          style={{ padding: '5px 12px', background: voted ? color : '#f1f5f9', color: voted ? '#fff' : '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, transition: 'all 0.15s' }}>
                          {voted ? '👍' : '👍'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {intersections.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Нет предложений для голосования</div>
        )}
      </div>
    </div>
  );
}
