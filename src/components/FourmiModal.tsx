import { useState } from 'react';
import { defaultFourmiCfg, type FourmiCfg, type FourmiEntry } from '../engine/laFourmi';

const ENTRIES: { key: FourmiEntry; label: string; hint: string }[] = [
  { key: 'hache', label: '✂️ Terrain haché', hint: 'On mise seulement juste après un changement de couleur (~la moitié des coups). On évite d’empiler pendant les dragons.' },
  { key: 'noDragon', label: '🐉 Sauf dragon', hint: 'On mise partout sauf pendant un run ≥ 3 (on saute les dragons).' },
  { key: 'always', label: '♾️ Tous les coups', hint: 'On mise chaque coup (volume max).' },
];

export function FourmiModal({
  baseUnit,
  current,
  onApply,
  onClose,
}: {
  baseUnit: number;
  current: FourmiCfg | null;
  onApply: (cfg: FourmiCfg) => void;
  onClose: () => void;
}) {
  const init = current ?? defaultFourmiCfg(baseUnit);
  const [side, setSide] = useState(init.side);
  const [unit, setUnit] = useState(init.unit);
  const [entry, setEntry] = useState<FourmiEntry>(init.entry);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="coach-modal" style={{ width: 'min(560px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="coach-head">
          <span className="coach-kicker">🐜 LA FOURMI</span>
          <button className="btn" onClick={onClose}>Fermer</button>
        </div>
        <p className="coach-text" style={{ marginTop: 0 }}>
          Perdre le minimum, gagner le plus souvent. <strong>Mise à plat</strong> (aucune progression),
          sur le côté à plus faible avantage maison. Joueur est aussi <strong>toujours payé plein</strong>
          {' '}(pas de « 6 payé moitié » qui fait tilter). Combine avec un Stop-loss / Take-profit serré.
        </p>

        <div className="coach-label" style={{ marginBottom: 8 }}>CÔTÉ</div>
        <div className="seg-toggle" style={{ marginBottom: 14 }}>
          <button className={side === 'P' ? 'active' : ''} onClick={() => setSide('P')}>
            🔵 Joueur <span className="muted" style={{ fontSize: 11 }}>· ~1,27 %</span>
          </button>
          <button className={side === 'B' ? 'active' : ''} onClick={() => setSide('B')}>
            🔴 Banquier <span className="muted" style={{ fontSize: 11 }}>· ~1,42 %</span>
          </button>
        </div>

        <div className="field">
          <label>Mise à plat</label>
          <input type="number" min={0} step={10} value={unit} onChange={(e) => setUnit(Math.max(0, Number(e.target.value)))} />
        </div>

        <div className="coach-label" style={{ margin: '6px 0 8px' }}>FILTRE D’ENTRÉE</div>
        <div className="tend-row">
          {ENTRIES.map((e) => (
            <button
              key={e.key}
              className={`venge-box entry-opt ${entry === e.key ? 'on-zig' : ''}`}
              onClick={() => setEntry(e.key)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <strong>{e.label}</strong>
              <div className="hint" style={{ marginTop: 4 }}>{e.hint}</div>
            </button>
          ))}
        </div>

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn gold" disabled={unit <= 0} onClick={() => onApply({ side, unit, entry })}>
            ▶ Activer La Fourmi
          </button>
        </div>
      </div>
    </div>
  );
}
