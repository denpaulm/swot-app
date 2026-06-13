import React, { useState } from 'react';

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

export default function Stage6_Actions({ session, identity, emit }) {
  const { initials } = identity;

  // Count intersections with no actions from this user
  const getUnfilledCount = () => {
    let count = 0;
    for (const { key, rowQ, colQ } of MATRICES) {
      const rows = session.topTheses[rowQ] || [];
      const cols = session.topTheses[colQ] || [];
      const mat = session.matrix[key] || [];
      rows.forEach((r, i) => cols.forEach((c, j) => {
        if (!mat[i]?.[j]) return;
        const iKey = `${key}_${r.id}_${c.id}`;
        const myActions = (session.actions[iKey] || []).filter(a => a.authorInitials === initials);
        if (!myActions.length) count++;
      }));
    }
    return count;
  };

  const unfilled = getUnfilledCount();

  // Build sorted intersection list
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
        const myActions = (session.actions[iKey] || []).filter(a => a.authorInitials === initials);
        list.push({ key: iKey, matKey: label, rowText: r.text, colText: c.text, weight: w, color, bg, myFilled: myActions.length > 0 });
      }));
    }
    return list.sort((a, b) => b.weight - a.weight);
  };

  const intersections = getAllIntersections();

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 10, padding: '12px 20px', marginBottom: 20, border: '1px solid #e2e8f0', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 14 }}>Предложите конкретные действия для каждого пересечения</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 13 }}>
          <span style={{ color: '#16a34a' }}>✓ Заполнено: {intersections.filter(x => x.myFilled).length}</span>
          <span style={{ color: unfilled > 0 ? '#d97706' : '#16a34a' }}>⚠ Осталось: {unfilled}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {intersections.map(({ key, matKey, rowText, colText, weight, color, bg, myFilled }) => (
          <IntersectionCard
            key={key}
            intersectionKey={key}
            matKey={matKey}
            rowText={rowText}
            colText={colText}
            weight={weight}
            color={color}
            bg={bg}
            myFilled={myFilled}
            actions={session.actions[key] || []}
            initials={initials}
            emit={emit}
          />
        ))}
        {intersections.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Нет активных пересечений в матрице</div>
        )}
      </div>
    </div>
  );
}

function IntersectionCard({ intersectionKey, matKey, rowText, colText, weight, color, bg, myFilled, actions, initials, emit }) {
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    emit('action:add', { intersectionKey, text: text.trim() });
    setText('');
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditText(a.text);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    emit('action:update', { intersectionKey, actionId: editingId, text: editText.trim() });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const deleteAction = (actionId) => {
    emit('action:delete', { intersectionKey, actionId });
  };

  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: myFilled ? `1.5px solid ${color}44` : '1.5px solid #fde047' }}>
      <div style={{ background: bg, padding: '10px 16px', borderBottom: `2px solid ${color}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ background: color, color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{matKey}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{rowText}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>× {colText}</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Вес</div>
          <div style={{ fontSize: 16, fontWeight: 700, color }}>{weight.toFixed(1)}</div>
        </div>
        {myFilled && <div style={{ fontSize: 18, flexShrink: 0 }}>✓</div>}
      </div>

      <div style={{ padding: 14 }}>
        {actions.map(a => {
          const isMine = a.authorInitials === initials;
          if (editingId === a.id) {
            return (
              <div key={a.id} style={{ marginBottom: 6 }}>
                <textarea value={editText} onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') cancelEdit(); }}
                  rows={2}
                  autoFocus
                  style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${color}`, borderRadius: 8, fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button onClick={saveEdit} style={{ padding: '4px 12px', background: color, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Сохранить</button>
                  <button onClick={cancelEdit} style={{ padding: '4px 12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Отмена</button>
                </div>
              </div>
            );
          }
          return (
            <div key={a.id} style={{ fontSize: 13, padding: '8px 12px', background: isMine ? `${color}0d` : '#f8fafc',
              border: `1px solid ${isMine ? color + '33' : '#e2e8f0'}`, borderRadius: 7, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ flex: 1 }}>{a.text}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{a.authorInitials}</span>
                {isMine && (
                  <>
                    <button onClick={() => startEdit(a)} title="Редактировать"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#64748b', padding: '0 2px', lineHeight: 1 }}>✏</button>
                    <button onClick={() => deleteAction(a.id)} title="Удалить"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#ef4444', padding: '0 2px', lineHeight: 1 }}>✕</button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Add action */}
        <div style={{ display: 'flex', gap: 8, marginTop: actions.length ? 8 : 0 }}>
          <textarea value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Предложите конкретное действие..."
            rows={2}
            style={{ flex: 1, padding: '8px 12px', border: `1.5px solid ${color}44`, borderRadius: 8, fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={submit}
            style={{ padding: '0 14px', background: color, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18, alignSelf: 'stretch' }}>+</button>
        </div>
      </div>
    </div>
  );
}
