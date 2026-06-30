import { analyzeShoe } from '../engine/analysis';
import { effectiveCap, stakeForStage } from '../engine/coach';
import { useMoney } from '../state/currency';
import type { Advice, CoachConfig, Outcome } from '../engine/types';
import { SequenceTrail, StakeLadder } from './AdviceVisuals';

export function CoachOverlay({
  advice,
  config,
  outcomes,
  onClose,
}: {
  advice: Advice;
  config: CoachConfig;
  outcomes: Outcome[];
  onClose: () => void;
}) {
  const fmt = useMoney();
  const a = analyzeShoe(outcomes);
  const { action, side, amount, stage } = advice;

  const decision =
    action === 'stop'
      ? { title: 'STOP — on ne joue pas', cls: 'stop' }
      : action === 'wait'
        ? { title: 'ON ATTEND', cls: 'wait' }
        : {
            title: `JE MISERAIS ${fmt(amount)} sur ${side === 'P' ? 'JOUEUR' : 'BANQUIER'}`,
            cls: side === 'P' ? 'player' : 'banker',
          };

  // Plan selon résultat (pédagogie), différent selon la stratégie
  const isDragon = advice.strategy === 'dragon';
  const winPlan = isDragon
    ? `Je gagne → le dragon continue. Je peux re-suivre au coup suivant (toujours à plat).`
    : `Je gagne → j'encaisse et je reviens à la mise de base (${fmt(stakeForStage(0, config))}).`;
  const losePlan = isDragon
    ? `Je perds → le dragon a cassé. J'arrête : une seule perte, pas de chasse.`
    : stage + 1 < config.maxStages
      ? `Je perds → palier suivant : ${fmt(stakeForStage(stage + 1, config))} (palier ${stage + 2}/${config.maxStages}).`
      : `Je perds → STOP forcé : j'encaisse la perte et je repars à zéro. Pas de chasse.`;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="coach-modal" onClick={(e) => e.stopPropagation()}>
        <div className="coach-head">
          <span className="coach-kicker">LE CONSEIL DU COACH</span>
          <button className="btn" onClick={onClose}>
            Fermer <span className="kbd">S</span>
          </button>
        </div>

        {/* DÉCISION */}
        <div className={`coach-decision ${decision.cls}`}>{decision.title}</div>

        {/* SCHÉMA DE LA SÉRIE */}
        <div className="coach-section">
          <div className="coach-label">① La série actuelle</div>
          <SequenceTrail
            outcomes={outcomes}
            predict={action === 'bet' ? side : advice.signal.recommend}
            count={12}
          />
          <div className="muted" style={{ marginTop: 6 }}>
            {advice.signal.label}
          </div>
        </div>

        {/* POURQUOI */}
        <div className="coach-section">
          <div className="coach-label">② Pourquoi</div>
          <p className="coach-text">{advice.reason}</p>
          <div className="coach-mini">
            <span className={`reg-badge ${a.regularity}`}>SABOT {a.regularity.toUpperCase()}</span>
            <span className="muted">
              derived roads : {a.reds}/3 rouge ({a.pattern.label} {a.pattern.cnLabel})
            </span>
          </div>
          <ul className="tips" style={{ marginTop: 8 }}>
            {a.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>

        {/* GESTION DE MISE */}
        {action !== 'wait' && (
          <div className="coach-section">
            <div className="coach-label">③ Gestion de la mise</div>
            {isDragon ? (
              <p className="coach-text">
                🐉 Sur un dragon, on mise <strong>à plat</strong> ({fmt(stakeForStage(0, config))})
                et on le suit tant qu'il dure. Pas de martingale : si le dragon casse, on encaisse
                la perte et on arrête.
              </p>
            ) : (
              <StakeLadder config={config} stage={stage} active={action === 'bet'} />
            )}
            <div className="muted" style={{ marginTop: 8 }}>
              Plafond par mise : {fmt(effectiveCap(config))} · mise max {fmt(config.maxBet)}
            </div>
          </div>
        )}

        {/* PLAN */}
        {action === 'bet' && (
          <div className="coach-section">
            <div className="coach-label">④ Mon plan</div>
            <div className="plan-line win">✅ {winPlan}</div>
            <div className="plan-line lose">❌ {losePlan}</div>
          </div>
        )}

        {action === 'wait' && (
          <div className="coach-section">
            <p className="coach-text">
              Pas de signal net. La discipline, c'est aussi <strong>ne pas jouer</strong>. On laisse
              le sabot se dessiner et on attend un vrai zigzag (ou un sabot redevenu lisible).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
