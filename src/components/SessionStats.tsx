import { tallies } from '../engine/roads';
import { useMoney } from '../state/currency';
import type { CoachConfig, Hand, Outcome } from '../engine/types';

export function SessionStats({
  stack,
  startStack,
  config,
  hands,
  outcomes,
}: {
  stack: number;
  startStack: number;
  config: CoachConfig;
  hands: Hand[];
  outcomes: Outcome[];
}) {
  const fmt = useMoney();
  const profit = stack - startStack;
  const t = tallies(outcomes);
  const bets = hands.filter((h) => h.bet);
  const wins = bets.filter((h) => h.bet?.result === 'win').length;
  const losses = bets.filter((h) => h.bet?.result === 'lose').length;
  const winRate = bets.length ? Math.round((wins / (wins + losses || 1)) * 100) : 0;

  return (
    <div>
      <div className="stat-row">
        <div className="stat">
          <div className="k">Stack actuel</div>
          <div className="v gold">{fmt(stack)}</div>
        </div>
        <div className="stat">
          <div className="k">Mise max</div>
          <div className="v">{fmt(config.maxBet)}</div>
        </div>
        <div className="stat">
          <div className="k">Profit session</div>
          <div className={`v ${profit > 0 ? 'pos' : profit < 0 ? 'neg' : ''}`}>
            {profit >= 0 ? '+' : ''}
            {fmt(profit)}
          </div>
        </div>
        <div className="stat">
          <div className="k">Paris gagnés</div>
          <div className="v">
            {wins}/{bets.length} {bets.length ? `(${winRate}%)` : ''}
          </div>
        </div>
      </div>
      <div className="tally">
        <span className="p">P {t.P}</span>
        <span className="b">B {t.B}</span>
        <span className="t">T {t.T}</span>
        <span className="muted">· {t.total} coups</span>
      </div>
    </div>
  );
}
