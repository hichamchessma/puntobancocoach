import { betPayout } from '../engine/coach';
import type { Hand } from '../engine/types';

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');

export function HistoryList({ hands }: { hands: Hand[] }) {
  if (hands.length === 0) {
    return <div className="empty-note">Aucun coup joué pour l'instant.</div>;
  }
  return (
    <div className="history">
      {[...hands].reverse().map((h) => {
        const pl = h.bet?.result ? betPayout(h.bet.side, h.bet.amount, h.bet.result) : 0;
        const plClass = pl > 0 ? 'pos' : pl < 0 ? 'neg' : 'zero';
        return (
          <div className="hist-row" key={h.id}>
            <div className={`hist-chip ${h.outcome}`}>{h.outcome}</div>
            <div>
              <div>Coup #{h.id + 1}</div>
              <div className="hist-bet">
                {h.bet
                  ? `Misé ${fmt(h.bet.amount)} sur ${h.bet.side} (palier ${h.bet.stage + 1})`
                  : 'Pas de mise'}
              </div>
            </div>
            <div className={`hist-pl ${plClass}`}>
              {h.bet?.result === 'push'
                ? '±0'
                : pl === 0
                  ? ''
                  : `${pl > 0 ? '+' : ''}${fmt(pl)}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
