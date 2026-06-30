import type { Outcome } from '../engine/types';

export interface ToastData {
  id: number;
  outcome: Outcome;
  natural: boolean;
}

/** Message glassmorphism annonçant le résultat (overlay, n'affecte pas la mise en page). */
export function ResultToast({ toast }: { toast: ToastData | null }) {
  if (!toast) return null;
  const { outcome, natural } = toast;
  const cls = outcome === 'P' ? 'player' : outcome === 'B' ? 'banker' : 'tie';
  const label =
    outcome === 'P' ? 'JOUEUR GAGNE' : outcome === 'B' ? 'BANQUIER GAGNE' : 'ÉGALITÉ';

  return (
    // key force le redémarrage de l'animation à chaque nouvelle main
    <div key={toast.id} className={`result-toast ${cls}`}>
      <span className="rt-label">{label}</span>
      {natural && <span className="rt-natural">NATUREL</span>}
    </div>
  );
}
