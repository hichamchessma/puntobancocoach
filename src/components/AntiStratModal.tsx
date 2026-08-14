import { useState } from 'react';
import { defaultAntiCfg, type AntiCfg } from '../engine/antiStrat';
import { AntiConfigEditor } from './AntiConfig';

export function AntiStratModal({
  baseUnit,
  current,
  onApply,
  onClose,
}: {
  baseUnit: number;
  current: AntiCfg | null;
  onApply: (cfg: AntiCfg) => void;
  onClose: () => void;
}) {
  const [cfg, setCfg] = useState<AntiCfg>(current ?? defaultAntiCfg(baseUnit));
  const usable = (s: AntiCfg['antiZig']) => s.enabled && (s.useN1 || s.useN2);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="coach-modal" style={{ width: 'min(760px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="coach-head">
          <span className="coach-kicker">⚔️ STRAT ANTI</span>
          <button className="btn" onClick={onClose}>Fermer</button>
        </div>
        <p className="coach-text" style={{ marginTop: 0 }}>
          On parie <strong>contre</strong> la tendance : Anti-zigzag mise que le zigzag va s'arrêter
          (dédoublement, même couleur) ; Anti-dragon mise que la série casse (couleur opposée).
          <strong> Ultra-flex</strong> : coche le niveau 2, le niveau 1, ou les deux. Les deux = strat
          complète (départ niv.2, puis niv.1 en vengeance N cycles après une perte totale). Un seul =
          on ne joue que ce niveau-là. Après tous paliers perdus, on suit la tendance à plat jusqu'à
          la casse. Priorité anti-zigzag &gt; anti-dragon.
        </p>

        <AntiConfigEditor value={cfg} onChange={setCfg} />

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button
            className="btn gold"
            disabled={!usable(cfg.antiZig) && !usable(cfg.antiDrag)}
            onClick={() => onApply(cfg)}
          >
            ▶ Activer la strat anti
          </button>
        </div>
      </div>
    </div>
  );
}
