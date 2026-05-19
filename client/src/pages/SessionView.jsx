import React from 'react';
import ModeratorPanel from '../components/ModeratorPanel.jsx';
import Stage1_Theses from '../stages/Stage1_Theses.jsx';
import Stage2_Cleanup from '../stages/Stage2_Cleanup.jsx';
import Stage3_Scoring from '../stages/Stage3_Scoring.jsx';
import Stage4_TopSelection from '../stages/Stage4_TopSelection.jsx';
import Stage5_Matrix from '../stages/Stage5_Matrix.jsx';
import Stage6_Actions from '../stages/Stage6_Actions.jsx';
import Stage7_Voting from '../stages/Stage7_Voting.jsx';
import Stage8_Plan from '../stages/Stage8_Plan.jsx';

const STAGE_NAMES = [
  '', 'Сбор тезисов', 'Объединение дублей', 'Оценка тезисов',
  'Отбор ТОП', 'Матрица пересечений', 'Предложения действий',
  'Голосование', 'Итоговый план'
];

const Q_COLOR = { S: '#2563eb', W: '#dc2626', O: '#16a34a', T: '#d97706' };

export default function SessionView({ session, identity, emit, connected, aiThinking }) {
  if (!session) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#64748b', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: 16 }}>Подключение к сессии...</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const { isMod, initials, modToken, sessionId } = identity;

  const stageProps = { session, identity, emit, isMod, initials };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Reconnecting banner */}
      {!connected && (
        <div style={{ background: '#dc2626', color: '#fff', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 14, fontWeight: 600 }}>
          <div style={{ width: 16, height: 16, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          Соединение потеряно — переподключение... Ваши данные сохранены, никуда не уходите.
        </div>
      )}
      {/* Header */}
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{session.name}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{session.goal}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {aiThinking && (
            <div style={{ background: '#7c3aed', color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> ИИ анализирует...
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {session.participants.map(p => (
              <span key={p} style={{ background: p === initials ? '#2563eb' : '#334155', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{p}</span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: connected ? '#4ade80' : '#f87171' }}>
            {connected ? '● Подключён' : '○ Нет связи'}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Код: <b style={{ color: '#fff', letterSpacing: 1 }}>{session.id}</b></div>
        </div>
      </div>

      {/* Stage indicator */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 24px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {STAGE_NAMES.slice(1).map((name, i) => {
          const stageNum = i + 1;
          const active = session.stage === stageNum;
          const done = session.stage > stageNum;
          return (
            <div key={stageNum} style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                background: active ? '#2563eb' : done ? '#16a34a' : '#e2e8f0',
                color: active || done ? '#fff' : '#94a3b8' }}>
                {done ? '✓' : stageNum}
              </div>
              <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? '#1a1a2e' : '#94a3b8' }}>{name}</span>
              {i < 7 && <span style={{ color: '#e2e8f0', marginLeft: 4 }}>›</span>}
            </div>
          );
        })}
      </div>

      {/* Moderator panel */}
      {isMod && <ModeratorPanel session={session} emit={emit} modToken={modToken} sessionId={sessionId} aiThinking={aiThinking} />}

      {/* Stage content */}
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {session.stage === 1 && <Stage1_Theses {...stageProps} />}
        {session.stage === 2 && <Stage2_Cleanup {...stageProps} />}
        {session.stage === 3 && <Stage3_Scoring {...stageProps} />}
        {session.stage === 4 && <Stage4_TopSelection {...stageProps} />}
        {session.stage === 5 && <Stage5_Matrix {...stageProps} />}
        {session.stage === 6 && <Stage6_Actions {...stageProps} />}
        {session.stage === 7 && <Stage7_Voting {...stageProps} />}
        {session.stage === 8 && <Stage8_Plan {...stageProps} modToken={modToken} />}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
