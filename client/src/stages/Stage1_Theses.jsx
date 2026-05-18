import React, { useState } from 'react';

const QUADRANTS = [
  { key: 'S', label: 'Сильные стороны', color: '#2563eb', bg: '#dbeafe', hint: 'Внутренние факторы, которые дают конкурентное преимущество прямо сейчас.' },
  { key: 'W', label: 'Слабые стороны', color: '#dc2626', bg: '#fee2e2', hint: 'Внутренние ограничения или недостатки, которые мешают достижению целей.' },
  { key: 'O', label: 'Возможности', color: '#16a34a', bg: '#dcfce7', hint: 'Внешние факторы или тенденции, которые можно использовать в свою пользу.' },
  { key: 'T', label: 'Угрозы', color: '#d97706', bg: '#fef3c7', hint: 'Внешние факторы, которые могут навредить или помешать достижению целей.' },
];

const GOOD_THESIS_TIPS = `Хороший тезис для SWOT:
✓ Конкретный: «Наличие прямого доступа к JPY-счетам» — а не «хорошие связи»
✓ Измеримый или фактический: можно проверить
✓ Краткий: 1–2 предложения
✓ Относится к правильному квадранту`;

export default function Stage1_Theses({ session, identity, emit }) {
  const [inputs, setInputs] = useState({ S: '', W: '', O: '', T: '' });
  const { initials } = identity;

  const submit = (q) => {
    const text = inputs[q].trim();
    if (!text) return;
    emit('thesis:add', { text, quadrant: q });
    setInputs(prev => ({ ...prev, [q]: '' }));
  };

  const handleKey = (e, q) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(q); }
  };

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 20, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 22 }}>💡</div>
        <pre style={{ fontFamily: 'inherit', fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{GOOD_THESIS_TIPS}</pre>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {QUADRANTS.map(({ key, label, color, bg, hint }) => {
          const theses = session.theses[key] || [];
          return (
            <div key={key} style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1.5px solid ${color}22` }}>
              <div style={{ background: bg, padding: '12px 16px', borderBottom: `2px solid ${color}` }}>
                <div style={{ fontWeight: 700, color, fontSize: 16 }}>{label}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{hint}</div>
              </div>

              <div style={{ padding: 16 }}>
                {/* Input */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <textarea
                    value={inputs[key]}
                    onChange={e => setInputs(prev => ({ ...prev, [key]: e.target.value }))}
                    onKeyDown={e => handleKey(e, key)}
                    placeholder="Введите тезис и нажмите Enter..."
                    rows={2}
                    style={{ flex: 1, padding: '8px 12px', border: `1.5px solid ${color}44`, borderRadius: 8, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                  />
                  <button onClick={() => submit(key)}
                    style={{ padding: '0 14px', background: color, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18, alignSelf: 'stretch' }}>+</button>
                </div>

                {/* Thesis list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {theses.map(t => (
                    <ThesisCard key={t.id} thesis={t} color={color} initials={initials} emit={emit} />
                  ))}
                  {theses.length === 0 && (
                    <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Тезисов пока нет</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThesisCard({ thesis, color, initials, emit }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(thesis.text);
  const canEdit = thesis.authorInitials === initials;

  const saveEdit = () => {
    if (editText.trim() && editText !== thesis.text) {
      emit('thesis:edit', { id: thesis.id, text: editText });
    }
    setEditing(false);
  };

  return (
    <div style={{ border: `1.5px solid ${thesis.aiValid === false ? '#fca5a5' : color + '33'}`, borderRadius: 8, padding: '10px 12px', background: thesis.aiValid === false ? '#fff1f2' : thesis.aiNote ? '#fffbeb' : '#fafafa', position: 'relative' }}>
      {editing ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} autoFocus
            style={{ flex: 1, padding: '6px 10px', border: `1.5px solid ${color}`, borderRadius: 6, fontSize: 13, resize: 'none', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button onClick={saveEdit} style={{ padding: '4px 10px', background: color, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✓</button>
            <button onClick={() => { setEditing(false); setEditText(thesis.text); }} style={{ padding: '4px 10px', background: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✗</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 6 }}>{thesis.text}</div>

          {/* AI feedback */}
          {thesis.aiValid === false && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 10px', fontSize: 12, marginBottom: 6 }}>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>⚠ ИИ: тезис требует доработки</div>
              {thesis.aiNote && <div style={{ color: '#991b1b', marginBottom: thesis.aiSuggestion ? 6 : 0 }}>{thesis.aiNote}</div>}
              {thesis.aiSuggestion && (
                <div>
                  <span style={{ color: '#374151' }}>Предлагаемая формулировка: <i>{thesis.aiSuggestion}</i></span>
                  {canEdit && (
                    <button onClick={() => emit('thesis:edit', { id: thesis.id, text: thesis.aiSuggestion })}
                      style={{ marginLeft: 8, padding: '2px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                      Принять
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {thesis.aiValid !== false && thesis.aiSuggestion && (
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: '6px 10px', fontSize: 12, marginBottom: 6 }}>
              <b>💡 ИИ предлагает улучшить:</b> {thesis.aiSuggestion}
              {canEdit && (
                <button onClick={() => emit('thesis:edit', { id: thesis.id, text: thesis.aiSuggestion })}
                  style={{ marginLeft: 8, padding: '2px 8px', background: '#ca8a04', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                  Принять
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', borderRadius: 10, padding: '2px 8px' }}>{thesis.authorInitials}</span>
            {canEdit && (
              <>
                <button onClick={() => setEditing(true)}
                  style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>✏ Ред.</button>
                <button onClick={() => emit('thesis:delete', { id: thesis.id })}
                  style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
