import { useState } from 'react';
import { useMoney } from '../state/currency';
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
  const fmt = useMoney();
  const [zigzag, setZigzag] = useState(current?.zigzag ?? true);
  const [zigBet, setZigBet] = useState(current?.zigzagBet ?? baseUnit);
  const [dragon, setDragon] = useState(current?.dragon ?? true);
  const [dragBet, setDragBet] = useState(current?.dragonBet ?? baseUnit);

  const apply = () =>
    onApply({
      zigzag,
      zigzagBet: Math.max(0, zigBet),
      dragon,
      dragonBet: Math.max(0, dragBet),
    });

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="coach-modal" style={{ width: 'min(560px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="coach-head">
          <span className="coach-kicker">🐉 STRAT TENDANCE</span>
          <button className="btn" onClick={onClose}>Fermer</button>
        </div>
        <p className="coach-text" style={{ marginTop: 0 }}>
          Suit la tendance en <strong>mise à plat</strong> : Zigzag (dès un changement → on parie
          l'alternance) et/ou Dragon (dès un doublement → on parie la série). On suit tant que ça
          tient, on s'arrête dès que ça casse. Une seule mise par tendance.
        </p>

        <div className="tend-row">
          <div className={`venge-box ${zigzag ? 'on-zig' : ''}`}>
            <label className="toggle" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={zigzag} onChange={() => setZigzag((v) => !v)} />
              🏓 <strong>Zigzag</strong>
            </label>
            <div className="field" style={{ marginTop: 8, opacity: zigzag ? 1 : 0.45 }}>
              <label>Mise à plat</label>
              <input type="number" min={0} step={10} value={zigBet} disabled={!zigzag} onChange={(e) => setZigBet(Number(e.target.value))} />
            </div>
          </div>
          <div className={`venge-box ${dragon ? 'on-drag' : ''}`}>
            <label className="toggle" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={dragon} onChange={() => setDragon((v) => !v)} />
              🐉 <strong>Dragon</strong>
            </label>
            <div className="field" style={{ marginTop: 8, opacity: dragon ? 1 : 0.45 }}>
              <label>Mise à plat</label>
              <input type="number" min={0} step={10} value={dragBet} disabled={!dragon} onChange={(e) => setDragBet(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn gold" disabled={!zigzag && !dragon} onClick={apply}>
            ▶ Activer stratTendance
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          {zigzag && `Zigzag ${fmt(zigBet)}`}
          {zigzag && dragon && ' · '}
          {dragon && `Dragon ${fmt(dragBet)}`}
        </div>
      </div>
    </div>
  );
}
