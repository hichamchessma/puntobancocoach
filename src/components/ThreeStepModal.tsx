import { useState } from 'react';
import { defaultThreeStepCfg, type ThreeStepCfg } from '../engine/threeStep';

function StakeLine({
  stakes,
  disabled,
  venge,
  onChange,
}: {
  stakes: number[];
  disabled?: boolean;
  venge?: boolean;
  onChange: (i: number, v: number) => void;
}) {
  return (
    <div className="stakes-row">
      {stakes.map((s, i) => (
        <div key={i} className="stake-field">
          <span className={`stake-idx ${venge ? 'venge' : ''} st${i + 1}`}>Palier {i + 1}</span>
          <input type="number" min={0} step={10} value={s} disabled={disabled} onChange={(e) => onChange(i, Number(e.target.value))} />
        </div>
      ))}
    </div>
  );
}

export function ThreeStepModal({
  baseUnit,
  current,
  onApply,
  onClose,
}: {
  baseUnit: number;
  current: ThreeStepCfg | null;
  onApply: (cfg: ThreeStepCfg) => void;
  onClose: () => void;
}) {
  const init = current ?? defaultThreeStepCfg(baseUnit);
  const [side, setSide] = useState(init.side);
  const [base, setBase] = useState<number[]>(init.base);
  const [v1On, setV1On] = useState(init.v1On);
  const [v1, setV1] = useState<number[]>(init.v1);
  const [v2On, setV2On] = useState(init.v2On);
  const [v2, setV2] = useState<number[]>(init.v2);

  const upd = (setter: (a: number[]) => void, arr: number[]) => (i: number, v: number) =>
    setter(arr.map((x, j) => (j === i ? Math.max(0, v) : x)));

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="coach-modal" style={{ width: 'min(620px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="coach-head">
          <span className="coach-kicker">🎯 3 STEPS</span>
          <button className="btn" onClick={onClose}>Fermer</button>
        </div>
        <p className="coach-text" style={{ marginTop: 0 }}>
          Martingale sur <strong>3 paliers</strong> (1‑2‑4), à chaque coup. Victoire → reset ; les 3
          perdus → vengeance niveau 1 (si active). Vengeance 1 perdue 2 fois de suite → vengeance
          niveau 2. Vengeances <strong>désactivées par défaut</strong>.
        </p>

        <div className="coach-label" style={{ marginBottom: 8 }}>CÔTÉ</div>
        <div className="seg-toggle" style={{ marginBottom: 14 }}>
          <button className={side === 'P' ? 'active' : ''} onClick={() => setSide('P')}>🔵 Joueur</button>
          <button className={side === 'B' ? 'active' : ''} onClick={() => setSide('B')}>🔴 Banquier</button>
        </div>

        <div className="coach-label" style={{ marginBottom: 8 }}>MISE DE BASE (3 paliers)</div>
        <StakeLine stakes={base} onChange={upd(setBase, base)} />

        <div className={`venge-box ${v1On ? 'on' : ''}`} style={{ marginTop: 14 }}>
          <label className="toggle" style={{ color: 'var(--text)' }}>
            <input type="checkbox" checked={v1On} onChange={() => setV1On((x) => !x)} />
            🔥 <strong>Vengeance niveau 1</strong> — après perte des 3 paliers de base
          </label>
          <div style={{ marginTop: 8, opacity: v1On ? 1 : 0.45 }}>
            <StakeLine stakes={v1} disabled={!v1On} venge onChange={upd(setV1, v1)} />
          </div>
        </div>

        <div className={`venge-box ${v2On ? 'on' : ''}`} style={{ marginTop: 12 }}>
          <label className="toggle" style={{ color: 'var(--text)' }}>
            <input type="checkbox" checked={v2On} onChange={() => setV2On((x) => !x)} />
            🔥🔥 <strong>Vengeance niveau 2</strong> — si la vengeance 1 perd 2 fois de suite
          </label>
          <div style={{ marginTop: 8, opacity: v2On ? 1 : 0.45 }}>
            <StakeLine stakes={v2} disabled={!v2On} venge onChange={upd(setV2, v2)} />
          </div>
          {v2On && !v1On && <div className="hint" style={{ marginTop: 6 }}>⚠️ La vengeance 2 n'entre en jeu que si la vengeance 1 est active.</div>}
        </div>

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn gold" onClick={() => onApply({ side, base, v1On, v1, v2On, v2 })}>
            ▶ Activer 3 Steps
          </button>
        </div>
      </div>
    </div>
  );
}
