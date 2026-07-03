import { useState } from 'react';
import { useMoney } from '../state/currency';
import type { Advice, Side } from '../engine/types';
import type { BetMode, PendingBet } from '../state/session';
import { Chip, CHIP_PALETTE } from './Chip';

/** Décompose un montant en jetons (du plus grand au plus petit). */
function chipStack(amount: number, denoms: number[]): number[] {
  const res: number[] = [];
  let a = amount;
  for (const d of [...denoms].sort((x, y) => y - x)) {
    while (a >= d && res.length < 14) {
      res.push(d);
      a -= d;
    }
  }
  return res;
}

export function CasinoBet({
  betMode,
  pendingBet,
  stack,
  maxBet,
  baseUnit,
  advice,
  canDeal,
  onBetMode,
  onPlace,
  onDeal,
}: {
  betMode: BetMode;
  pendingBet: PendingBet | null;
  stack: number;
  maxBet: number;
  baseUnit: number;
  advice: Advice;
  canDeal: boolean; // simulateur : on peut distribuer (Espace / bouton)
  onBetMode: (m: BetMode) => void;
  onPlace: (bet: PendingBet | null) => void;
  onDeal: () => void;
}) {
  const money = useMoney();
  const denoms = [baseUnit, baseUnit * 2, baseUnit * 4, baseUnit * 10];
  const [chip, setChip] = useState(denoms[0]);
  const cap = Math.max(0, Math.min(maxBet, stack));

  const zoneAmount = (side: Side) => (pendingBet?.side === side ? pendingBet.amount : 0);
  const placeOn = (side: Side) => {
    const cur = zoneAmount(side);
    const amount = Math.min(cur + chip, cap);
    if (amount > 0) onPlace({ side, amount });
  };

  return (
    <div className="casino-bet">
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
        <div>
          <div className="muted" style={{ marginBottom: 10 }}>
            🤖 Le coach place ses mises automatiquement.
            {advice.action === 'bet' && advice.side
              ? ` Prochaine : ${advice.side === 'P' ? 'JOUEUR' : 'BANQUIER'} ${money(advice.amount)}.`
              : ' (il attend un signal)'}
          </div>
          {canDeal ? (
            <button className="btn gold big" onClick={onDeal}>
              🂠 Distribuer <span className="kbd">Espace</span>
            </button>
          ) : (
            <div className="muted">Enregistre le résultat réel ci-dessous.</div>
          )}
        </div>
      ) : (
        <>
          {/* 1) Choix de la valeur du jeton */}
          <div className="chip-rack">
            {denoms.map((d, i) => (
              <button
                key={i}
                className={`chip-pick ${chip === d ? 'sel' : ''}`}
                onClick={() => setChip(d)}
                title={`Jeton ${money(d)}`}
              >
                <Chip value={d} color={CHIP_PALETTE[i % CHIP_PALETTE.length]} size={54} />
              </button>
            ))}
            <div className="rack-hint">
              Jeton sélectionné : <strong style={{ color: 'var(--gold)' }}>{money(chip)}</strong>
              {pendingBet && (
                <button className="link-btn" onClick={() => onPlace(null)}>
                  retirer la mise
                </button>
              )}
            </div>
          </div>

          {/* 2) Zones de mise circulaires */}
          <div className="bet-felt">
            <BetZone side="P" amount={zoneAmount('P')} denoms={denoms} onClick={() => placeOn('P')} money={money} />
            <BetZone side="B" amount={zoneAmount('B')} denoms={denoms} onClick={() => placeOn('B')} money={money} />
          </div>

          {/* 3) Distribuer */}
          {canDeal ? (
            <button className="btn gold big deal-btn" onClick={onDeal}>
              🂠 DISTRIBUER <span className="kbd">Espace</span>
            </button>
          ) : (
            <div className="bet-tip">Pose ta mise, puis enregistre le résultat réel ci-dessous.</div>
          )}

          {advice.action === 'bet' && advice.side && (
            <div className="bet-tip">
              💡 Le coach suggère <strong>{advice.side === 'P' ? 'JOUEUR' : 'BANQUIER'}</strong>{' '}
              {money(advice.amount)}.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BetZone({
  side,
  amount,
  denoms,
  onClick,
  money,
}: {
  side: Side;
  amount: number;
  denoms: number[];
  onClick: () => void;
  money: (n: number) => string;
}) {
  const stack = chipStack(amount, denoms);
  const label = side === 'P' ? 'JOUEUR' : 'BANQUIER';
  const pay = side === 'P' ? 'paie 1:1' : 'paie 1:1 · 6 = ½';
  return (
    <button className={`bet-zone ${side === 'P' ? 'player' : 'banker'}`} onClick={onClick}>
      <span className="bz-label">{label}</span>
      <span className="bz-pay">{pay}</span>
      <span className="bz-chips">
        {stack.map((v, i) => {
          const idx = denoms.indexOf(v);
          return (
            <span key={i} className="bz-chip" style={{ marginTop: i ? -30 : 0, zIndex: i }}>
              <Chip value={v} color={CHIP_PALETTE[(idx < 0 ? 0 : idx) % CHIP_PALETTE.length]} size={40} />
            </span>
          );
        })}
      </span>
      {amount > 0 && <span className="bz-total">{money(amount)}</span>}
    </button>
  );
}
