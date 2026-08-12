// Simulation de la stratégie du joueur pour marquer la Big Road :
//
// Signal = une NOUVELLE répétition = une colonne qui atteint 2 pastilles de la
// même couleur, juste après un changement de couleur (rouge ou bleu).
// Mise = TOUJOURS Banquier (= rouge) sur le coup suivant. On gagne si ce coup
// est Banquier (rouge), on perd s'il est Joueur (bleu).
//
// Progression 1-2-4-8 unités, toujours Banquier :
//   étape 1 (1u) -> perd -> étape 2 (2u) collée
//     perd étape 2 = 2 bleus = zone de perte -> on ATTEND un nouveau signal
//   étape 3 (4u) -> perd -> étape 4 (8u) collée
//     perd étape 4 = perte max (4 Banquier perdus)
//   une victoire à n'importe quelle étape -> reset complet.
//
// On renvoie, par index de résultat (hors égalités = index de cellule Big Road),
// les points de victoire et la perte finale (étape 4).

import { withoutTies } from './patterns';
import type { Outcome } from './types';

export type StratMark = { kind: 'win' | 'loss4'; stage: number };

export function computeStrategyMarks(outcomes: Outcome[]): Map<number, StratMark> {
  const seq = withoutTies(outcomes); // 'P' (bleu/Joueur) | 'B' (rouge/Banquier)
  const marks = new Map<number, StratMark>();

  type State = 'WATCH_1' | 'R1' | 'R2' | 'WATCH_3' | 'R3' | 'R4';
  let state: State = 'WATCH_1';
  const stageOf: Record<'R1' | 'R2' | 'R3' | 'R4', number> = { R1: 1, R2: 2, R3: 3, R4: 4 };

  const isBanker = (i: number) => seq[i] === 'B'; // rouge = gagne
  // nouvelle répétition (2 mêmes après un changement) — on exclut la 1re colonne
  const signalAt = (i: number) => i >= 2 && seq[i] === seq[i - 1] && seq[i - 2] !== seq[i - 1];

  for (let i = 0; i < seq.length; i++) {
    let resolved = false;

    // 1) On résout d'abord la mise en attente sur ce coup
    if (state === 'R1' || state === 'R2' || state === 'R3' || state === 'R4') {
      resolved = true;
      const stage = stageOf[state];
      if (isBanker(i)) {
        marks.set(i, { kind: 'win', stage });
        state = 'WATCH_1';
      } else if (state === 'R1') {
        state = 'R2'; // double immédiat
      } else if (state === 'R2') {
        state = 'WATCH_3'; // 2 bleus = zone de perte, on attend un nouveau signal
      } else if (state === 'R3') {
        state = 'R4'; // double immédiat
      } else {
        marks.set(i, { kind: 'loss4', stage: 4 }); // perte des 4 Banquier
        state = 'WATCH_1';
      }
    }

    // 2) Détection d'un signal (jamais sur un coup où l'on vient de résoudre :
    //    ça évite de re-armer sur la zone de perte).
    if (!resolved && (state === 'WATCH_1' || state === 'WATCH_3') && signalAt(i)) {
      state = state === 'WATCH_1' ? 'R1' : 'R3';
    }
  }

  return marks;
}
