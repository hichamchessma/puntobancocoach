import { useState } from 'react';
import { useMoney } from '../state/currency';
import type { BetMode, PendingBet } from '../state/session';
import type { Advice } from '../engine/types';

export function BetControls({
  betMode,
  pendingBet,
  advice,
  baseUnit,
  maxBet,
  stack,
  onBetMode,
  onPendingBet,
}: {
  betMode: BetMode;
  pendingBet: PendingBet | null;
  advice: Advice;
  baseUnit: number;
  maxBet: number;
  stack: number;
  onBetMode: (m: BetMode) => void;
  onPendingBet: (b: PendingBet | null) => void;
}) {
  const fmt = useMoney();
  const [amount, setAmount] = useState(baseUnit);

  const quick = [1, 2, 5, 10].map((m) => Math.min(baseUnit * m, maxBet));
  const clampedAmount = Math.min(amount, maxBet, Math.max(0, stack));

  const place = (side: 'P' | 'B') => {
    if (clampedAmount <= 0) return;
    if (pendingBet && pendingBet.side === side && pendingBet.amount === clampedAmount) {
      onPendingBet(null); // re-clic = annule
    } else {
      onPendingBet({ side, amount: clampedAmount });
    }
  };

  return (
    <div className="bet-controls">
      <div className="bet-head">
        <span className="bet-title">TA MISE</span>
        <div className="seg-toggle">
          <button className={betMode === 'manual' ? 'active' : ''} onClick={() => onBetMode('manual')}>
            Je mise
          </button>
          <button className={betMode === 'coach' ? 'active' : ''} onClick={() => onBetMode('coach')}>
            Le coach mise
          </button>
        </div>
      </div>

      {betMode === 'coach' ? (
        <div className="muted" style={{ padding: '6px 0' }}>
          🤖 Le coach place ses mises automatiquement selon sa stratégie. Passe en{' '}
          <strong>« Je mise »</strong> pour décider toi-même.
        </div>
      ) : (
        <>
          <div className="chips-row">
            {quick.map((q, i) => (
              <button
                key={i}
                className={`chip-btn ${clampedAmount === q ? 'on' : ''}`}
                onClick={() => setAmount(q)}
              >
                {fmt(q)}
              </button>
            ))}
            <input
              className="chip-input"
              type="number"
              min={0}
              step={baseUnit}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              title="Montant personnalisé"
            />
          </div>

          <div className="bet-sides">
            <button
              className={`btn p big ${pendingBet?.side === 'P' ? 'sel' : ''}`}
              onClick={() => place('P')}
            >
              JOUEUR
            </button>
            <button
              className={`btn b big ${pendingBet?.side === 'B' ? 'sel' : ''}`}
              onClick={() => place('B')}
            >
              BANQUIER
            </button>
          </div>

          <div className="bet-status">
            {pendingBet ? (
              <span className="bet-pending">
                Mise prête : <strong>{fmt(pendingBet.amount)}</strong> sur{' '}
                <strong>{pendingBet.side === 'P' ? 'JOUEUR' : 'BANQUIER'}</strong>
                <button className="link-btn" onClick={() => onPendingBet(null)}>
                  annuler
                </button>
              </span>
            ) : (
              <span className="muted">Pas de mise — tu peux juste observer.</span>
            )}
            {advice.action === 'bet' && advice.side && (
              <button
                className="btn"
                onClick={() => onPendingBet({ side: advice.side!, amount: Math.min(advice.amount, maxBet, stack) })}
              >
                Suivre le coach ({advice.side === 'P' ? 'Joueur' : 'Banquier'} {fmt(advice.amount)})
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
