import { useState } from 'react';
import { CURRENCIES, formatMoney, type Currency } from '../engine/money';

export function OnboardingModal({
  onStart,
}: {
  onStart: (cfg: { stack: number; currency: Currency; baseUnit: number }) => void;
}) {
  const [currency, setCurrency] = useState<Currency>('DH');
  const [stack, setStack] = useState(25000);
  const [baseUnit, setBaseUnit] = useState(200);

  return (
    <div className="modal-back">
      <div className="coach-modal" style={{ width: 'min(520px, 96vw)' }}>
        <div className="coach-head">
          <span className="coach-kicker">DÉMARRER UNE SESSION</span>
        </div>

        <p className="coach-text" style={{ marginTop: 0 }}>
          Choisis ta <strong>bankroll</strong> et ta <strong>devise</strong>. Tout l'affichage
          (stack, mises, gains) suivra ce choix.
        </p>

        <div className="field">
          <label>Devise</label>
          <select className="select" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} ({c.symbol})
              </option>
            ))}
          </select>
        </div>

        <div className="stat-row">
          <div className="field">
            <label>Bankroll de départ</label>
            <input type="number" min={100} step={100} value={stack} onChange={(e) => setStack(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Mise de base</label>
            <input type="number" min={10} step={10} value={baseUnit} onChange={(e) => setBaseUnit(Number(e.target.value))} />
          </div>
        </div>

        <div className="muted" style={{ margin: '4px 0 16px' }}>
          Soit <strong style={{ color: 'var(--gold)' }}>{formatMoney(stack, currency)}</strong> de
          bankroll, mise de base {formatMoney(baseUnit, currency)}.
        </div>

        <button
          className="btn gold big"
          disabled={stack <= 0 || baseUnit <= 0}
          onClick={() => onStart({ stack, currency, baseUnit })}
        >
          🎴 Commencer à jouer
        </button>
      </div>
    </div>
  );
}
