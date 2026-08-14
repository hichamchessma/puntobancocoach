import { useState } from 'react';
import type { AutoTendanceCfg } from '../engine/strategy';

export function AutoTendanceModal({
  baseUnit,
  current,
  onApply,
  onClose,
}: {
  baseUnit: number;
  current: AutoTendanceCfg | null;
  onApply: (cfg: AutoTendanceCfg) => void;
  onClose: () => void;
}) {
  const [zigzag, setZigzag] = useState(current?.zigzag ?? true);
  const [zigBet, setZigBet] = useState(current?.zigzagBet ?? baseUnit);
  const [dragon, setDragon] = useState(current?.dragon ?? true);
  const [dragBet, setDragBet] = useState(current?.dragonBet ?? baseUnit);
  const [collage, setCollage] = useState(current?.collage ?? true);
  const [colBet, setColBet] = useState(current?.collageBet ?? baseUnit);
  const [decollage, setDecollage] = useState(current?.decollage ?? true);
  const [decBet, setDecBet] = useState(current?.decollageBet ?? baseUnit);

  const apply = () =>
    onApply({
      zigzag,
      zigzagBet: Math.max(0, zigBet),
      dragon,
      dragonBet: Math.max(0, dragBet),
      collage,
      collageBet: Math.max(0, colBet),
      decollage,
      decollageBet: Math.max(0, decBet),
    });

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="coach-modal" style={{ width: 'min(680px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="coach-head">
          <span className="coach-kicker">🐉 STRAT TENDANCE</span>
          <button className="btn" onClick={onClose}>Fermer</button>
        </div>
        <p className="coach-text" style={{ marginTop: 0 }}>
          Suit la tendance en <strong>mise à plat</strong>. Priorité : <strong>Collage</strong> &gt;{' '}
          <strong>Décollage</strong> &gt; Dragon &gt; Zigzag (collage/décollage n'existent qu'à des
          moments précis, sinon on retombe sur dragon/zigzag). Une seule mise par tendance.
        </p>

        <div className="tend-row">
          <div className={`venge-box ${collage ? 'on-drag' : ''}`}>
            <label className="toggle" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={collage} onChange={() => setCollage((v) => !v)} />
              🧲 <strong>Collage</strong>
            </label>
            <div className="hint">Après 2 runs ≥2, à chaque changement on parie que ça re-double.</div>
            <div className="field" style={{ marginTop: 6, opacity: collage ? 1 : 0.45 }}>
              <label>Mise à plat</label>
              <input type="number" min={0} step={10} value={colBet} disabled={!collage} onChange={(e) => setColBet(Number(e.target.value))} />
            </div>
          </div>
          <div className={`venge-box ${decollage ? 'on-zig' : ''}`}>
            <label className="toggle" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={decollage} onChange={() => setDecollage((v) => !v)} />
              ✂️ <strong>Décollage</strong>
            </label>
            <div className="hint">Zigzag de simples : on parie que ça reste 1-1-1 (pas de double).</div>
            <div className="field" style={{ marginTop: 6, opacity: decollage ? 1 : 0.45 }}>
              <label>Mise à plat</label>
              <input type="number" min={0} step={10} value={decBet} disabled={!decollage} onChange={(e) => setDecBet(Number(e.target.value))} />
            </div>
          </div>
          <div className={`venge-box ${dragon ? 'on-drag' : ''}`}>
            <label className="toggle" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={dragon} onChange={() => setDragon((v) => !v)} />
              🐉 <strong>Dragon</strong>
            </label>
            <div className="hint">Run ≥2 : on ride la série (mise même couleur).</div>
            <div className="field" style={{ marginTop: 6, opacity: dragon ? 1 : 0.45 }}>
              <label>Mise à plat</label>
              <input type="number" min={0} step={10} value={dragBet} disabled={!dragon} onChange={(e) => setDragBet(Number(e.target.value))} />
            </div>
          </div>
          <div className={`venge-box ${zigzag ? 'on-zig' : ''}`}>
            <label className="toggle" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={zigzag} onChange={() => setZigzag((v) => !v)} />
              🏓 <strong>Zigzag</strong>
            </label>
            <div className="hint">Dès un changement, on parie l'alternance (mise opposée).</div>
            <div className="field" style={{ marginTop: 6, opacity: zigzag ? 1 : 0.45 }}>
              <label>Mise à plat</label>
              <input type="number" min={0} step={10} value={zigBet} disabled={!zigzag} onChange={(e) => setZigBet(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn gold" disabled={!zigzag && !dragon && !collage && !decollage} onClick={apply}>
            ▶ Activer stratTendance
          </button>
        </div>
      </div>
    </div>
  );
}
