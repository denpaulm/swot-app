import React from 'react';

const QUADRANTS = [
  { key: 'S', label: 'Сильные стороны', color: '#2563eb', bg: '#dbeafe', dim1: 'Влияние на доходность', dim2: 'Влияние на конк. преимущества' },
  { key: 'W', label: 'Слабые стороны', color: '#dc2626', bg: '#fee2e2', dim1: 'Влияние на доходность', dim2: 'Влияние на конк. преимущества' },
  { key: 'O', label: 'Возможности', color: '#16a34a', bg: '#dcfce7', dim1: 'Вероятность', dim2: 'Влияние' },
  { key: 'T', label: 'Угрозы', color: '#d97706', bg: '#fef3c7', dim1: 'Вероятность', dim2: 'Влияние' },
];

// Only average when both dimensions are set
function calcPersonAvg(score) {
  if (score?.dim1 != null && score?.dim2 != null) return (score.dim1 + score.dim2) / 2;
  return null;
}

function calcThesisAvg(scores, id) {
  const s = scores[id] || {};
  const complete = Object.values(s).filter(v => v.dim1 != null && v.dim2 != null);
  if (!complete.length) return null;
  const sum = complete.reduce((a, v) => a + (v.dim1 + v.dim2) / 2, 0);
  return sum / complete.length;
}

function countComplete(scores, id, initials) {
  const s = scores[id] || {};
  return Object.keys(s).filter(who => s[who].dim1 != null && s[who].dim2 != null).length;
}

export default function Stage3_Scoring({ session, identity, emit }) {
  const { initials } = identity;

  const setDim = (thesisId, dim, val) => {
    emit('score:submitDim', { thesisId, dim, val });
  };

  const myProgress = () => {
    let scored = 0, total = 0;
    for (const q of ['S', 'W', 'O', 'T']) {
      for (const t of session.theses[q] || []) {
        total++;
        const s = session.scores[t.id]?.[initials];
        if (s?.dim1 != null && s?.dim2 != null) scored++;
      }
    }
    return { scored, total };
  };

  const { scored, total } = myProgress();

  return (
    <div>
      {/* Progress */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 14 }}>Ваш прогресс: <b>{scored}/{total}</b> тезисов оценено</div>
        <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 10, height: 8 }}>
          <div style={{ width: `${total ? (scored / total) * 100 : 0}%`, background: '#2563eb', height: 8, borderRadius: 10, transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Шкала 1–10 · Оцените обе строки для каждого тезиса</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {QUADRANTS.map(({ key, label, color, bg, dim1, dim2 }) => {
          const theses = session.theses[key] || [];
          return (
            <div key={key} style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ background: bg, padding: '10px 16px', borderBottom: `2px solid ${color}` }}>
                <div style={{ fontWeight: 700, color, fontSize: 15 }}>{label}</div>
              </div>
              <div style={{ padding: '4px 0' }}>
                {theses.map(t => {
                  const myScore = session.scores[t.id]?.[initials] || {};
                  const allScores = session.scores[t.id] || {};
                  const totalAvg = calcThesisAvg(session.scores, t.id);
                  const completeCount = countComplete(session.scores, t.id);
                  const myComplete = myScore.dim1 != null && myScore.dim2 != null;

                  return (
                    <div key={t.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: myComplete ? `${color}05` : '#fff' }}>
                      <div style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span>{t.text}</span>
                        {myComplete && <span style={{ fontSize: 16, flexShrink: 0 }}>✓</span>}
                      </div>

                      {/* Dim1 */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{dim1}</div>
                        <ScoreRow value={myScore.dim1} onChange={v => setDim(t.id, 'dim1', v)} color={color} />
                      </div>

                      {/* Dim2 */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{dim2}</div>
                        <ScoreRow value={myScore.dim2} onChange={v => setDim(t.id, 'dim2', v)} color={color} />
                      </div>

                      {/* Summary row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Проголосовало: <b>{completeCount}</b>
                          {totalAvg != null && <> · Средний балл: <b style={{ color }}>{totalAvg.toFixed(1)}</b></>}
                        </div>
                        {/* Participants scores */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {Object.entries(allScores).map(([who, s]) => {
                            const avg = calcPersonAvg(s);
                            if (avg == null) return null;
                            return (
                              <span key={who} style={{ fontSize: 10, background: who === initials ? color : '#f1f5f9', color: who === initials ? '#fff' : '#64748b', borderRadius: 10, padding: '2px 7px' }}>
                                {who}: {avg.toFixed(1)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {theses.length === 0 && <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>Тезисов нет</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreRow({ value, onChange, color }) {
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <button key={n} onClick={() => onChange(n)}
          style={{ width: 28, height: 28, border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12,
            fontWeight: value === n ? 700 : 400,
            background: value === n ? color : value != null && n <= value ? `${color}33` : '#f1f5f9',
            color: value === n ? '#fff' : '#64748b',
            transition: 'all 0.1s' }}>
          {n}
        </button>
      ))}
    </div>
  );
}
