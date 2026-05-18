import React from 'react';

const MATRICES = [
  { key: 'SO', rowQ: 'S', colQ: 'O', label: 'SO: Сильные стороны × Возможности', desc: 'Как использовать сильные стороны для реализации возможностей', color: '#2563eb', bg: '#dbeafe' },
  { key: 'ST', rowQ: 'S', colQ: 'T', label: 'ST: Сильные стороны × Угрозы', desc: 'Как использовать сильные стороны для нейтрализации угроз', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'WO', rowQ: 'W', colQ: 'O', label: 'WO: Слабые стороны × Возможности', desc: 'Как преодолеть слабые стороны используя возможности', color: '#16a34a', bg: '#dcfce7' },
  { key: 'WT', rowQ: 'W', colQ: 'T', label: 'WT: Слабые стороны × Угрозы', desc: 'Как минимизировать слабые стороны и избежать угроз', color: '#dc2626', bg: '#fee2e2' },
];

function calcAvg(scores, id) {
  const s = scores[id] || {};
  const vals = Object.values(s);
  if (!vals.length) return 0;
  const a1 = vals.reduce((a, v) => a + v.dim1, 0) / vals.length;
  const a2 = vals.reduce((a, v) => a + v.dim2, 0) / vals.length;
  return (a1 + a2) / 2;
}

function getWeightColor(w, max) {
  if (!w || !max) return '#f8fafc';
  const ratio = w / max;
  if (ratio > 0.75) return '#dcfce7';
  if (ratio > 0.5) return '#fef9c3';
  if (ratio > 0.25) return '#ffedd5';
  return '#f8fafc';
}

export default function Stage5_Matrix({ session, identity, emit, isMod }) {
  const toggle = (matrixKey, row, col) => {
    if (!isMod) return;
    emit('matrix:toggle', { matrixKey, row, col });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {MATRICES.map(({ key, rowQ, colQ, label, desc, color, bg }) => {
        const rows = session.topTheses[rowQ] || [];
        const cols = session.topTheses[colQ] || [];
        const mat = session.matrix[key] || [];

        if (!rows.length || !cols.length) return (
          <div key={key} style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color }}>{label}</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>Нет тезисов в одном из квадрантов</div>
          </div>
        );

        // Calc weights for color
        const weights = [];
        rows.forEach((r, i) => cols.forEach((c, j) => {
          if (mat[i]?.[j]) weights.push(calcAvg(session.scores, r.id) * calcAvg(session.scores, c.id));
        }));
        const maxW = Math.max(...weights, 0);

        return (
          <div key={key} style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ background: bg, padding: '12px 20px', borderBottom: `2px solid ${color}` }}>
              <div style={{ fontWeight: 700, color, fontSize: 15 }}>{label}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{desc}</div>
              {isMod && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Кликните ячейку для включения/выключения пересечения</div>}
            </div>

            <div style={{ overflowX: 'auto', padding: 16 }}>
              <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', minWidth: cols.length * 160 + 240 }}>
                <thead>
                  <tr>
                    <th style={{ width: 220, minWidth: 220, padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#94a3b8', borderBottom: '2px solid #e2e8f0', verticalAlign: 'bottom' }}></th>
                    {cols.map((c, j) => (
                      <th key={c.id} style={{ width: 160, minWidth: 140, padding: '8px 8px', fontSize: 12, color: '#374151', textAlign: 'center', borderBottom: `2px solid ${color}`, lineHeight: 1.4, verticalAlign: 'bottom' }}>
                        <div style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{c.text}</div>
                        <div style={{ fontSize: 11, color, fontWeight: 700, marginTop: 4 }}>{calcAvg(session.scores, c.id).toFixed(1)}</div>
                      </th>
                    ))}
                    <th style={{ width: 60, padding: '8px', fontSize: 12, color: '#94a3b8', textAlign: 'center', borderBottom: `2px solid ${color}`, verticalAlign: 'bottom' }}>Σ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const rScore = calcAvg(session.scores, r.id);
                    const rowSum = cols.reduce((sum, c, j) => {
                      if (mat[i]?.[j]) return sum + rScore * calcAvg(session.scores, c.id);
                      return sum;
                    }, 0);
                    return (
                      <tr key={r.id}>
                        <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid #f1f5f9', lineHeight: 1.4, verticalAlign: 'middle' }}>
                          <div style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{r.text}</div>
                          <div style={{ fontSize: 11, color, fontWeight: 700, marginTop: 3 }}>{rScore.toFixed(1)}</div>
                        </td>
                        {cols.map((c, j) => {
                          const hasX = mat[i]?.[j];
                          const w = hasX ? (rScore * calcAvg(session.scores, c.id)) : 0;
                          return (
                            <td key={c.id} onClick={() => toggle(key, i, j)}
                              style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid #f1f5f9', cursor: isMod ? 'pointer' : 'default',
                                background: hasX ? getWeightColor(w, maxW) : '#fafafa',
                                border: hasX ? `1.5px solid ${color}44` : '1.5px solid #f1f5f9', borderRadius: 4 }}>
                              {hasX ? (
                                <div>
                                  <div style={{ fontSize: 14 }}>✕</div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color }}>{w.toFixed(1)}</div>
                                </div>
                              ) : (
                                <div style={{ color: '#e2e8f0', fontSize: 16 }}>{isMod ? '·' : ''}</div>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ textAlign: 'center', padding: '8px', fontSize: 12, fontWeight: 700, color: rowSum > 0 ? color : '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>
                          {rowSum > 0 ? rowSum.toFixed(1) : ''}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Column sums */}
                  <tr>
                    <td style={{ padding: '6px 10px', fontSize: 11, color: '#94a3b8' }}>Σ</td>
                    {cols.map((c, j) => {
                      const colSum = rows.reduce((sum, r, i) => {
                        if (mat[i]?.[j]) return sum + calcAvg(session.scores, r.id) * calcAvg(session.scores, c.id);
                        return sum;
                      }, 0);
                      return (
                        <td key={c.id} style={{ textAlign: 'center', padding: '6px 8px', fontSize: 12, fontWeight: 700, color: colSum > 0 ? color : '#94a3b8' }}>
                          {colSum > 0 ? colSum.toFixed(1) : ''}
                        </td>
                      );
                    })}
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
