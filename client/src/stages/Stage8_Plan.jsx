import React from 'react';

const BLOCK_COLOR = { SO: '#2563eb', ST: '#7c3aed', WO: '#16a34a', WT: '#dc2626' };
const BLOCK_DESC = {
  SO: 'Использовать сильные стороны для реализации возможностей',
  ST: 'Использовать сильные стороны для нейтрализации угроз',
  WO: 'Преодолеть слабые стороны, используя возможности',
  WT: 'Минимизировать слабые стороны и избежать угроз',
};

function calcAvg(scores, id) {
  const s = scores[id] || {};
  const vals = Object.values(s);
  if (!vals.length) return 0;
  const a1 = vals.reduce((a, v) => a + v.dim1, 0) / vals.length;
  const a2 = vals.reduce((a, v) => a + v.dim2, 0) / vals.length;
  return (a1 + a2) / 2;
}

const MATRICES = [
  { key: 'SO', rowQ: 'S', colQ: 'O' },
  { key: 'ST', rowQ: 'S', colQ: 'T' },
  { key: 'WO', rowQ: 'W', colQ: 'O' },
  { key: 'WT', rowQ: 'W', colQ: 'T' },
];

export default function Stage8_Plan({ session, identity, emit, modToken }) {
  const buildPlan = () => {
    const items = [];
    for (const { key, rowQ, colQ } of MATRICES) {
      const rows = session.topTheses[rowQ] || [];
      const cols = session.topTheses[colQ] || [];
      const mat = session.matrix[key] || [];
      rows.forEach((r, i) => {
        cols.forEach((c, j) => {
          if (!mat[i]?.[j]) return;
          const w = calcAvg(session.scores, r.id) * calcAvg(session.scores, c.id);
          const iKey = `${key}_${r.id}_${c.id}`;
          const acts = session.actions[iKey] || [];
          const topActs = [...acts].sort((a, b) => b.votes.length - a.votes.length).slice(0, 5);
          topActs.forEach(act => {
            items.push({ block: key, weight: w, rowText: r.text, colText: c.text, action: act.text, votes: act.votes.length });
          });
        });
      });
    }
    return items.sort((a, b) => b.weight - a.weight);
  };

  const plan = buildPlan();
  const maxWeight = plan[0]?.weight || 1;

  return (
    <div>
      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '16px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{session.name}</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>{session.goal}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <div style={{ textAlign: 'center', padding: '8px 16px', background: '#f0fdf4', borderRadius: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{plan.length}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Действий</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 16px', background: '#ede9fe', borderRadius: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#7c3aed' }}>{session.participants.length}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Участников</div>
          </div>
          {identity.isMod && (
            <a href={`/api/sessions/${session.id}/export?token=${modToken}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: '#16a34a', color: '#fff', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
              ⬇ Скачать Excel
            </a>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(BLOCK_COLOR).map(([block, color]) => (
          <div key={block} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 8, padding: '6px 14px', border: `1.5px solid ${color}44` }}>
            <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{block}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{BLOCK_DESC[block]}</span>
          </div>
        ))}
      </div>

      {/* Plan table */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', borderBottom: '2px solid #e2e8f0', width: 40 }}>#</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', borderBottom: '2px solid #e2e8f0', width: 60 }}>Блок</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', borderBottom: '2px solid #e2e8f0', width: 80 }}>Вес</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Действие</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>Пересечение</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: '#64748b', borderBottom: '2px solid #e2e8f0', width: 60 }}>👍</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((item, idx) => {
              const color = BLOCK_COLOR[item.block];
              const intensity = item.weight / maxWeight;
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: color, color: '#fff', borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 700 }}>{item.block}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 40, background: '#e2e8f0', borderRadius: 6, height: 8 }}>
                        <div style={{ width: `${intensity * 100}%`, background: color, height: 8, borderRadius: 6 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{item.weight.toFixed(1)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, lineHeight: 1.5 }}>{item.action}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                    <div style={{ marginBottom: 2 }}>{item.rowText}</div>
                    <div style={{ color: '#94a3b8' }}>× {item.colText}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14, fontWeight: 700, color }}>{item.votes}</td>
                </tr>
              );
            })}
            {plan.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Нет действий в плане</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
