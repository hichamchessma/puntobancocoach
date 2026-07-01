import { buildBigRoad } from '../engine/roads';
import type { Outcome, Side } from '../engine/types';

/**
 * Mini Big Road (comme le shoe) : affiche `trigger` (le signal) en pastilles
 * normales, puis les `bets` (résultats pariés) en pastilles dorées 🎯.
 */
export function MiniRoad({
  trigger,
  bets,
}: {
  trigger: Side[];
  bets?: { side: Side; amount: number }[];
}) {
  const full: Outcome[] = [...trigger, ...(bets?.map((b) => b.side) ?? [])];
  const cells = buildBigRoad(full);
  const cols = Math.max(1, ...cells.map((c) => c.col + 1));

  return (
    <div className="mini-road" style={{ gridTemplateColumns: `repeat(${cols}, 20px)` }}>
      {cells.map((c, i) => {
        const isBet = i >= trigger.length;
        return (
          <div
            key={i}
            className={`dot ${c.outcome === 'P' ? 'dot--bigP' : 'dot--bigB'} ${isBet ? 'betdot' : ''}`}
            style={{ gridColumn: c.col + 1, gridRow: c.row + 1 }}
          >
            {isBet ? '🎯' : ''}
          </div>
        );
      })}
    </div>
  );
}
