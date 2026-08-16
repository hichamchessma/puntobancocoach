import { useMoney } from '../state/currency';
import type { Side } from '../engine/types';
import { AutoBetZones } from './CasinoBet';

/**
 * Panneau d'une auto-stratégie : garde la table Joueur/Banquier visible avec les
 * jetons posés sur le côté que la stratégie va miser (lecture seule), + réglages.
 */
export function AutoStratPanel({
  title,
  bet,
  subLabel,
  baseUnit,
  canDeal,
  onRegler,
  onDesactiver,
  onDeal,
}: {
  title: string;
  bet: { side: Side; amount: number } | null;
  subLabel: string | null;
  baseUnit: number;
  canDeal: boolean;
  onRegler: () => void;
  onDesactiver: () => void;
  onDeal: () => void;
}) {
  const money = useMoney();
  return (
    <div className="auto-strat-panel">
      <div className="asp-head">
        <span className="asp-title">{title}</span>
        <div className="btn-row">
          <button className="btn" onClick={onRegler}>⚙ Régler</button>
          <button className="btn" onClick={onDesactiver}>⏹ Désactiver</button>
        </div>
      </div>

      <AutoBetZones bet={bet} baseUnit={baseUnit} />

      <div className="asp-bet">
        {bet ? (
          <>
            <span className={`asp-chip ${bet.side === 'P' ? 'p' : 'b'}`}>
              {bet.side === 'P' ? '🔵 JOUEUR' : '🔴 BANQUIER'}
            </span>
            <span className="asp-amount">{money(bet.amount)}</span>
            {subLabel && <span className="asp-stage">{subLabel}</span>}
          </>
        ) : (
          <span className="asp-wait">⏳ Aucune mise ce coup — la strat attend</span>
        )}
      </div>

      {canDeal ? (
        <button className="btn gold big deal-btn" onClick={onDeal}>
          🂠 DISTRIBUER <span className="kbd">Espace</span>
        </button>
      ) : (
        <div className="bet-tip">Enregistre le résultat réel ci-dessous.</div>
      )}
    </div>
  );
}
