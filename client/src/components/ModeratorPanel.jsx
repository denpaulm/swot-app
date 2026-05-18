import React from 'react';

const STAGE_ACTIONS = {
  1: { label: 'Закрыть сбор → Этап 2: Анализ дублей', next: 2, color: '#7c3aed' },
  2: { label: 'Подтвердить и перейти к оценке (этап 3)', next: 3, color: '#2563eb' },
  3: { label: 'Перейти к отбору ТОП (этап 4)', next: 4, color: '#2563eb' },
  4: { label: 'Построить матрицу с ИИ (этап 5)', next: 5, color: '#16a34a' },
  5: { label: 'Открыть сбор действий (этап 6)', next: 6, color: '#16a34a' },
  6: { label: 'Открыть голосование (этап 7)', next: 7, color: '#d97706' },
  7: { label: 'Сформировать итоговый план (этап 8)', next: 8, color: '#dc2626' },
  8: null,
};

export default function ModeratorPanel({ session, emit, modToken, sessionId, aiThinking }) {
  const action = STAGE_ACTIONS[session.stage];

  const goNext = () => {
    if (!action) return;
    emit('mod:setStage', { stage: action.next });
  };

  const goBack = () => {
    if (session.stage > 1) emit('mod:setStage', { stage: session.stage - 1 });
  };

  const countTheses = () => {
    let n = 0;
    for (const q of ['S', 'W', 'O', 'T']) n += (session.theses[q] || []).length;
    return n;
  };

  return (
    <div style={{ background: '#2d1b69', color: '#fff', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd' }}>🎛 МОДЕРАТОР</div>

      <div style={{ fontSize: 13, color: '#e2e8f0' }}>
        Участников: <b>{session.participants.length}</b>
        {session.stage === 1 && <> · Тезисов: <b>{countTheses()}</b></>}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
        {session.stage > 1 && (
          <button onClick={goBack} style={{ padding: '8px 18px', background: 'transparent', border: '1.5px solid #6d28d9', color: '#c4b5fd', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            ← Назад
          </button>
        )}
        {action && (
          <button onClick={goNext} disabled={aiThinking}
            style={{ padding: '8px 22px', background: aiThinking ? '#4b5563' : action.color, color: '#fff', border: 'none', borderRadius: 8, cursor: aiThinking ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
            {aiThinking ? '⟳ ИИ работает...' : action.label}
          </button>
        )}
        {session.stage === 8 && (
          <a href={`/api/sessions/${sessionId}/export?token=${modToken}`}
            style={{ padding: '8px 22px', background: '#16a34a', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            ⬇ Экспорт Excel
          </a>
        )}
      </div>
    </div>
  );
}
