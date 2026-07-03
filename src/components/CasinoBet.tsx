import { useState } from 'react';
import { useMoney } from '../state/currency';
import type { Advice, Side } from '../engine/types';
import type { BetMode } from '../state/session';
import { Chip, CHIP_PALETTE } from './Chip';

export function CasinoBet({
  betMode,
  stack,
  maxBet,
  baseUnit,
  advice,
  dealsOnPlace,
  showDealButton,
  onBetMode,
  onBetDeal,
  onDeal,
}: {
  betMode: BetMode;
  stack: number;
  maxBet: number;
  baseUnit: number;
  advice: Advice;
  dealsOnPlace: boolean; // true en simulateur (clic côté = distribue)
  showDealButton: boolean; // bouton distribuer en mode coach
  onBetMode: (m: BetMode) => void;
  onBetDeal: (side: Side, amount: number) => void;
  onDeal: () => void;
}) {
  const money = useMoney();
  const denoms = [baseUnit, baseUnit * 2, baseUnit * 4, baseUnit * 10];
  const [stake, setStake] = useState<number[]>([]);
  const total = stake.reduce((a, b) => a + b, 0);
  const cap = Math.max(0, Math.min(maxBet, stack));

  const addChip = (v: number) => setStake((s) => (total + v <= cap ? [...s, v] : s));
  const clear = () => setStake([]);
  const place = (side: Side) => {
    onBetDeal(side, total);
    setStake([]);
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
          {showDealButton && (
            <button className="btn gold big" onClick={onDeal}>
              🂠 Distribuer la main suivante <span className="kbd">Espace</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Rack de jetons */}
          <div className="chip-rack">
            {denoms.map((d, i) => (
              <button
                key={i}
                className="chip-pick"
                onClick={() => addChip(d)}
                disabled={total + d > cap}
                title={`Ajouter ${money(d)}`}
              >
                <Chip value={d} color={CHIP_PALETTE[i % CHIP_PALETTE.length]} size={54} />
              </button>
            ))}

            <div className="stake-box">
              <div className="stake-pile">
                {stake.length === 0 ? (
                  <span className="muted">Choisis tes jetons…</span>
                ) : (
                  stake.slice(-10).map((v, i) => {
                    const idx = denoms.indexOf(v);
                    return (
                      <span key={i} className="pile-chip" style={{ marginLeft: i ? -34 : 0, zIndex: i }}>
                        <Chip value={v} color={CHIP_PALETTE[(idx < 0 ? 0 : idx) % CHIP_PALETTE.length]} size={44} />
                      </span>
                    );
                  })
                )}
              </div>
              <div className="stake-total">{money(total)}</div>
              {total > 0 && (
                <button className="link-btn" onClick={clear}>
                  effacer
                </button>
              )}
            </div>
          </div>

          {/* Spots : cliquer = miser (+ distribuer en simulateur) */}
          <div className="bet-spots">
            <button className="spot player" onClick={() => place('P')}>
              <span className="spot-name">JOUEUR</span>
              <span className="spot-sub">
                {dealsOnPlace
                  ? total > 0
                    ? `miser ${money(total)} & distribuer`
                    : 'distribuer (sans miser)'
                  : total > 0
                    ? `miser ${money(total)} sur Joueur`
                    : 'choisis un jeton'}
              </span>
            </button>
            <button className="spot banker" onClick={() => place('B')}>
              <span className="spot-name">BANQUIER</span>
              <span className="spot-sub">
                {dealsOnPlace
                  ? total > 0
                    ? `miser ${money(total)} & distribuer`
                    : 'distribuer (sans miser)'
                  : total > 0
                    ? `miser ${money(total)} sur Banquier`
                    : 'choisis un jeton'}
              </span>
            </button>
          </div>

          <div className="bet-tip">
            {advice.action === 'bet' && advice.side ? (
              <>💡 Le coach suggère <strong>{advice.side === 'P' ? 'JOUEUR' : 'BANQUIER'}</strong> {money(advice.amount)}.</>
            ) : (
              <>Clique un jeton pour l'ajouter (1×, 2×…), puis un côté pour distribuer.</>
            )}
          </div>
        </>
      )}
    </div>
  );
}
