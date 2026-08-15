import { useState } from 'react';
import { useMoney } from '../state/currency';
import type { AutoStratCfg } from '../engine/strategy';

export function AutoStratModal({
  baseUnit,
  current,
  onApply,
  onClose,
}: {
  baseUnit: number;
  current: AutoStratCfg | null;
  onApply: (cfg: AutoStratCfg) => void;
  onClose: () => void;
}) {
  const fmt = useMoney();
  const b = baseUnit;
  const [side, setSide] = useState(current?.side ?? 'P');
  const [stakes, setStakes] = useState<number[]>(current?.stakes ?? [b, b * 2, b * 4, b * 8]);
  const [vengeance, setVengeance] = useState(current?.vengeance ?? false);
  const [venStakes, setVenStakes] = useState<number[]>(
    current?.vengeanceStakes ?? [b * 5, b * 10, b * 20, b * 40],
  );
  const [venTimes, setVenTimes] = useState(current?.vengeanceTimes ?? 3);

  const setStake = (i: number, v: number) =>
    setStakes((s) => s.map((x, j) => (j === i ? Math.max(0, v) : x)));
  const setVen = (i: number, v: number) =>
    setVenStakes((s) => s.map((x, j) => (j === i ? Math.max(0, v) : x)));

  const apply = () =>
    onApply({
      side,
      stakes: stakes.map((s) => Math.max(0, s)),
      vengeance,
      vengeanceStakes: venStakes.map((s) => Math.max(0, s)),
      vengeanceTimes: Math.max(1, venTimes),
    });

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="coach-modal" style={{ width: 'min(560px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="coach-head">
          <span className="coach-kicker">🤖 AUTO-STRATÉGIE</span>
          <button className="btn" onClick={onClose}>Fermer</button>
        </div>
        <p className="coach-text" style={{ marginTop: 0 }}>
          Le coach placera automatiquement la mise de TA stratégie coup par coup (sur le côté choisi
          au signal, 0 sinon). Choisis le côté, règle les montants, puis valide.
        </p>

        <div className="coach-label" style={{ marginBottom: 8 }}>CÔTÉ MISÉ</div>
        <div className="seg-toggle" style={{ marginBottom: 14 }}>
          <button className={side === 'P' ? 'active' : ''} onClick={() => setSide('P')}>
            🔵 Joueur <span className="muted" style={{ fontSize: 11 }}>· payé plein</span>
          </button>
          <button className={side === 'B' ? 'active' : ''} onClick={() => setSide('B')}>
            🔴 Banquier <span className="muted" style={{ fontSize: 11 }}>· 6 = moitié</span>
          </button>
        </div>

        <div className="coach-label" style={{ marginBottom: 8 }}>MISE PAR ÉTAPE ({side === 'P' ? 'Joueur' : 'Banquier'})</div>
        <div className="stakes-row">
          {stakes.map((s, i) => (
            <div key={i} className="stake-field">
              <span className={`stake-idx st${i + 1}`}>Étape {i + 1}</span>
              <input type="number" min={0} step={10} value={s} onChange={(e) => setStake(i, Number(e.target.value))} />
            </div>
          ))}
        </div>

        <div className={`venge-box ${vengeance ? 'on' : ''}`} style={{ marginTop: 14 }}>
          <div className="venge-head">
            <label className="toggle" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={vengeance} onChange={() => setVengeance((v) => !v)} />
              🔥 <strong>Vengeance</strong> après perte étape 4
            </label>
            <div className="field inline" style={{ marginLeft: 'auto' }}>
              <label>Cycles</label>
              <input type="number" min={1} max={20} value={venTimes} disabled={!vengeance} onChange={(e) => setVenTimes(Number(e.target.value))} />
            </div>
          </div>
          <div className="stakes-row" style={{ opacity: vengeance ? 1 : 0.45 }}>
            {venStakes.map((s, i) => (
              <div key={i} className="stake-field">
                <span className={`stake-idx venge st${i + 1}`}>Veng. {i + 1}</span>
                <input type="number" min={0} step={10} value={s} disabled={!vengeance} onChange={(e) => setVen(i, Number(e.target.value))} />
              </div>
            ))}
          </div>
        </div>

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn gold" onClick={apply}>
            ▶ Activer l'auto-stratégie
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Échelle : {stakes.map((s) => fmt(s)).join(' → ')}
        </div>
      </div>
    </div>
  );
}
