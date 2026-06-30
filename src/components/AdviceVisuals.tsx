// Petits visuels réutilisables pour schématiser le conseil.

import { stakeForStage } from '../engine/coach';
import { withoutTies } from '../engine/patterns';
import type { CoachConfig, Outcome, Side } from '../engine/types';

/** Affiche la fin de la séquence (sans Tie) en pastilles + la prédiction. */
export function SequenceTrail({
  outcomes,
  predict,
  count = 8,
}: {
  outcomes: Outcome[];
  predict?: Side | null;
  count?: number;
}) {
  const seq = withoutTies(outcomes).slice(-count);
  if (seq.length === 0) return <div className="muted">Pas encore d'historique.</div>;
  return (
    <div className="trail">
      {seq.map((s, i) => (
        <span key={i} className={`trail-dot ${s === 'P' ? 'p' : 'b'}`}>
          {s}
        </span>
      ))}
      {predict && (
        <>
          <span className="trail-arrow">→</span>
          <span className={`trail-dot predict ${predict === 'P' ? 'p' : 'b'}`}>{predict}</span>
        </>
      )}
    </div>
  );
}

/** Échelle de mises bornée : 200 → 400 → 600 → STOP, palier courant surligné. */
export function StakeLadder({
  config,
  stage,
  active,
}: {
  config: CoachConfig;
  stage: number;
  active: boolean;
}) {
  return (
    <div className="ladder">
      {Array.from({ length: config.maxStages }).map((_, i) => {
        const amt = stakeForStage(i, config);
        const isCurrent = active && i === stage;
        const isLast = i === config.maxStages - 1;
        return (
          <span key={i} className="ladder-step">
            <span className={`chip ${isCurrent ? 'on' : ''} ${isLast ? 'danger' : ''}`}>
              {amt.toLocaleString('fr-FR')}
            </span>
            <span className="ladder-arrow">→</span>
          </span>
        );
      })}
      <span className="ladder-stop">STOP</span>
    </div>
  );
}
