import type { Outcome } from '../engine/types';

export interface ToastData {
  id: number;
  outcome: Outcome;
  natural: boolean;
  betText?: string; // ex. "+200 DH" / "-200 DH" / "mise rendue"
  betWon?: boolean | null; // true gagné, false perdu, null/undefined neutre
}

/** Message glassmorphism annonçant le résultat (overlay, n'affecte pas la mise en page). */
export function ResultToast({ toast }: { toast: ToastData | null }) {
  if (!toast) return null;
  const { outcome, natural, betText, betWon } = toast;
  const cls = outcome === 'P' ? 'player' : outcome === 'B' ? 'banker' : 'tie';
  const label =
    outcome === 'P' ? 'JOUEUR GAGNE' : outcome === 'B' ? 'BANQUIER GAGNE' : 'ÉGALITÉ';

  return (
    // key force le redémarrage de l'animation à chaque nouvelle main
    <div key={toast.id} className={`result-toast ${cls}`}>
      <div className="rt-top">
        <span className="rt-label">{label}</span>
        {natural && <span className="rt-natural">NATUREL</span>}
      </div>
      {betText && (
        <span className={`rt-bet ${betWon === true ? 'win' : betWon === false ? 'lose' : ''}`}>
          {betText}
        </span>
      )}
    </div>
  );
}
