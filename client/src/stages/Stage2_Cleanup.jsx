import React, { useState } from 'react';

const Q_LABELS = { S: 'Сильные', W: 'Слабые', O: 'Возможности', T: 'Угрозы' };
const Q_COLOR = { S: '#2563eb', W: '#dc2626', O: '#16a34a', T: '#d97706' };

export default function Stage2_Cleanup({ session, identity, emit }) {
  const { isMod } = identity;
  const proposals = session.mergeProposals || [];
  const pending = proposals.filter(p => p.status === 'pending');
  const decided = proposals.filter(p => p.status !== 'pending');

  const allTheses = ['S', 'W', 'O', 'T'].flatMap(q =>
    (session.theses[q] || []).map(t => ({ ...t, quadrant: q }))
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left: All theses */}
        <div>
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>Все тезисы ({allTheses.length})</h3>
          {['S', 'W', 'O', 'T'].map(q => {
            const theses = session.theses[q] || [];
            if (!theses.length) return null;
            return (
              <div key={q} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: Q_COLOR[q], fontSize: 14, marginBottom: 8 }}>{Q_LABELS[q]}</div>
                {theses.map(t => (
                  <div key={t.id} style={{ fontSize: 13, padding: '6px 12px', background: '#fff', border: `1px solid ${Q_COLOR[q]}33`, borderRadius: 6, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span>{t.text}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8, whiteSpace: 'nowrap' }}>{t.authorInitials}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Right: Merge proposals */}
        <div>
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>Предложения ИИ по объединению</h3>

          {proposals.length === 0 && (
            <div style={{ background: '#f8fafc', border: '1.5px dashed #e2e8f0', borderRadius: 10, padding: 24, textAlign: 'center', color: '#94a3b8' }}>
              {isMod
                ? 'ИИ анализирует тезисы... Подождите несколько секунд'
                : 'ИИ анализирует тезисы на похожие формулировки...'}
            </div>
          )}

          {pending.map(p => <MergeCard key={p.id} proposal={p} isMod={isMod} emit={emit} allTheses={allTheses} />)}

          {decided.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>Обработанные ({decided.length}):</div>
              {decided.map(p => (
                <div key={p.id} style={{ fontSize: 12, padding: '6px 12px', background: p.status === 'approved' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${p.status === 'approved' ? '#86efac' : '#fca5a5'}`, borderRadius: 6, marginBottom: 4 }}>
                  <span>{p.status === 'approved' ? '✓' : '✗'} {p.proposedText}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MergeCard({ proposal, isMod, emit, allTheses }) {
  const [editText, setEditText] = useState(proposal.proposedText);

  const originals = proposal.ids.map(id => allTheses.find(t => t.id === id)).filter(Boolean);

  return (
    <div style={{ background: '#fff', border: '1.5px solid #fde047', borderRadius: 10, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: '#92400e', marginBottom: 10, fontWeight: 600 }}>🔀 Похожие тезисы:</div>
      {originals.map(t => (
        <div key={t.id} style={{ fontSize: 12, color: '#374151', background: '#fffbeb', padding: '5px 10px', borderRadius: 6, marginBottom: 4 }}>
          <b style={{ color: Q_COLOR[t.quadrant] }}>[{t.quadrant}]</b> {t.text} <span style={{ color: '#94a3b8' }}>({t.authorInitials})</span>
        </div>
      ))}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>Объединённая формулировка:</div>
        {isMod ? (
          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #fde047', borderRadius: 6, fontSize: 13, resize: 'none', fontFamily: 'inherit', marginBottom: 10 }} />
        ) : (
          <div style={{ fontSize: 13, padding: '8px 10px', background: '#f0fdf4', borderRadius: 6, marginBottom: 10 }}>{proposal.proposedText}</div>
        )}
        {isMod && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => emit('merge:decide', { proposalId: proposal.id, action: 'approve', editedText: editText })}
              style={{ flex: 1, padding: '8px 0', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              ✓ Объединить
            </button>
            <button onClick={() => emit('merge:decide', { proposalId: proposal.id, action: 'reject' })}
              style={{ flex: 1, padding: '8px 0', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
              ✗ Оставить как есть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
