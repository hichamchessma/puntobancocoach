import type { Advice, CoachConfig, Outcome } from '../engine/types';
import { SequenceTrail, StakeLadder } from './AdviceVisuals';

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' DH';

export function AdvicePanel({
  advice,
  config,
  outcomes,
  onDetails,
}: {
  advice: Advice;
  config: CoachConfig;
  outcomes: Outcome[];
  onDetails: () => void;
}) {
  const { action, side, amount, stage, reason, riskNote } = advice;

  const pillClass =
    action === 'stop' ? 'stop' : action === 'wait' ? 'wait' : side === 'P' ? 'player' : 'banker';
  const pillText =
    action === 'stop'
      ? 'STOP'
      : action === 'wait'
        ? 'ATTENDRE'
        : side === 'P'
          ? 'JOUEUR'
          : 'BANQUIER';

  return (
    <div className={`advice ${action}`}>
      <div className="action-line">
        <span className={`pill ${pillClass}`}>{pillText}</span>
        {action === 'bet' && <span className="amount">{fmt(amount)}</span>}
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={onDetails} title="Détail du conseil (touche S)">
          Détail <span className="kbd">S</span>
        </button>
      </div>

      {/* Schéma : la fin de la série + la prédiction */}
      <div className="advice-schema">
        <SequenceTrail outcomes={outcomes} predict={action === 'bet' ? side : advice.signal.recommend} />
      </div>

      {/* Échelle de mise bornée (zigzag) ou mise à plat (dragon) */}
      {advice.strategy === 'zigzag' || action === 'stop' ? (
        <div style={{ margin: '10px 0' }}>
          <StakeLadder config={config} stage={stage} active={action === 'bet'} />
        </div>
      ) : advice.strategy === 'dragon' ? (
        <div className="muted" style={{ margin: '10px 0' }}>
          🐉 Mise <strong style={{ color: 'var(--gold)' }}>à plat</strong> sur le dragon · si le
          dragon casse, on arrête (pas de chasse).
        </div>
      ) : null}

      <div className="reason">{reason}</div>
      {riskNote && <div className="risk">⚠ {riskNote}</div>}
    </div>
  );
}
