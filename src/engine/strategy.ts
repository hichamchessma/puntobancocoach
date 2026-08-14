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

import { opposite, withoutTies } from './patterns';
import type { Outcome, Side } from './types';

export type TendKind = 'zig' | 'drag' | 'collage' | 'decollage';

// Config d'auto-jeu de stratTendance (mise à plat). 4 tendances, priorité :
// collage > décollage > dragon > zigzag.
export interface AutoTendanceCfg {
  zigzag: boolean; // classique : dès un changement -> parie l'alternance
  zigzagBet: number;
  dragon: boolean; // classique : run >= 2 -> parie la série (on ride)
  dragonBet: number;
  collage: boolean; // double-chop : après 2 runs >=2, à chaque changement, parie que le nouveau run double
  collageBet: number;
  decollage: boolean; // zigzag de simples : 2 simples d'affilée, parie que ça reste simple
  decollageBet: number;
}

/** Découpe la fin de l'historique en runs {couleur, longueur}. */
function tailRuns(seq: Side[]): { color: Side; len: number }[] {
  const runs: { color: Side; len: number }[] = [];
  for (const s of seq) {
    const last = runs[runs.length - 1];
    if (last && last.color === s) last.len++;
    else runs.push({ color: s, len: 1 });
  }
  return runs;
}

/**
 * Décide la mise du PROCHAIN coup selon la structure des runs récents.
 * Priorité : collage > décollage > dragon > zigzag. null = aucune mise.
 */
export function nextTendanceBet(
  outcomes: Outcome[],
  cfg: AutoTendanceCfg,
): { side: Side; amount: number; tendance: TendKind } | null {
  const seq = withoutTies(outcomes);
  if (seq.length < 1) return null;
  const runs = tailRuns(seq);
  const cur = runs[runs.length - 1];
  const prev = runs[runs.length - 2];
  const prev2 = runs[runs.length - 3];
  const last = seq[seq.length - 1];

  if (cur.len === 1) {
    // on vient de changer de couleur (le run courant fait 1)
    const collageOk = !!prev && prev.len >= 2 && !!prev2 && prev2.len >= 2;
    const decollageOk = !!prev && prev.len === 1;
    if (cfg.collage && collageOk)
      return { side: last, amount: cfg.collageBet, tendance: 'collage' }; // parie que ça double
    if (cfg.decollage && decollageOk)
      return { side: opposite(last), amount: cfg.decollageBet, tendance: 'decollage' }; // parie zigzag
    if (cfg.zigzag && prev)
      return { side: opposite(last), amount: cfg.zigzagBet, tendance: 'zig' };
    return null;
  }
  // run courant >= 2 : le dragon ride la série
  if (cfg.dragon) return { side: last, amount: cfg.dragonBet, tendance: 'drag' };
  return null;
}

// win = vert · loss = orange (étapes 1/2/3) · loss4 = noir (perte finale des 4)
export type StratMark = { kind: 'win' | 'loss' | 'loss4'; stage: number };

// Config d'auto-jeu de la stratégie (mises par étape + vengeance)
export interface AutoStratCfg {
  stakes: number[]; // [é1, é2, é3, é4]
  vengeance: boolean;
  vengeanceStakes: number[];
  vengeanceTimes: number;
}

/**
 * Rejoue la machine sur l'historique et renvoie la mise à placer au PROCHAIN
 * coup (côté toujours Banquier). null = pas de signal actif = aucune mise.
 */
export function nextStrategyBet(
  outcomes: Outcome[],
  cfg: AutoStratCfg,
): { stage: number; amount: number } | null {
  const seq = withoutTies(outcomes);
  type State = 'WATCH_1' | 'R1' | 'R2' | 'WATCH_3' | 'R3' | 'R4';
  let state: State = 'WATCH_1';
  const stageOf = { R1: 1, R2: 2, R3: 3, R4: 4 } as const;

  const venOn = cfg.vengeance && cfg.vengeanceStakes.length === 4 && cfg.vengeanceTimes > 0;
  const venStakes = cfg.vengeanceStakes ?? cfg.stakes;
  let vengeanceLeft = 0;
  let cycleStakes = cfg.stakes;
  const endCycle = (win: boolean) => {
    if (!venOn) return;
    if (win) {
      if (vengeanceLeft > 0) vengeanceLeft--;
    } else vengeanceLeft = cfg.vengeanceTimes;
  };

  for (let i = 0; i < seq.length; i++) {
    let resolved = false;
    if (state === 'R1' || state === 'R2' || state === 'R3' || state === 'R4') {
      resolved = true;
      if (seq[i] === 'B') {
        state = 'WATCH_1';
        endCycle(true);
      } else if (state === 'R1') state = 'R2';
      else if (state === 'R2') state = 'WATCH_3';
      else if (state === 'R3') state = 'R4';
      else {
        state = 'WATCH_1';
        endCycle(false);
      }
    }
    if (!resolved && (state === 'WATCH_1' || state === 'WATCH_3')) {
      const sig = i >= 1 && seq[i] === seq[i - 1] && (i === 1 || seq[i - 2] !== seq[i - 1]);
      if (sig) {
        if (state === 'WATCH_1') {
          cycleStakes = venOn && vengeanceLeft > 0 ? venStakes : cfg.stakes;
          state = 'R1';
        } else state = 'R3';
      }
    }
  }

  if (state === 'R1' || state === 'R2' || state === 'R3' || state === 'R4') {
    const stage = stageOf[state];
    return { stage, amount: cycleStakes[stage - 1] ?? 0 };
  }
  return null;
}

export function computeStrategyMarks(outcomes: Outcome[]): Map<number, StratMark> {
  const seq = withoutTies(outcomes); // 'P' (bleu/Joueur) | 'B' (rouge/Banquier)
  const marks = new Map<number, StratMark>();

  type State = 'WATCH_1' | 'R1' | 'R2' | 'WATCH_3' | 'R3' | 'R4';
  let state: State = 'WATCH_1';
  const stageOf: Record<'R1' | 'R2' | 'R3' | 'R4', number> = { R1: 1, R2: 2, R3: 3, R4: 4 };

  const isBanker = (i: number) => seq[i] === 'B'; // rouge = gagne
  // nouvelle répétition : 2 mêmes couleurs, la 2e après un changement (la 1re
  // colonne du sabot compte aussi = un run de 2 dès le début).
  const signalAt = (i: number) =>
    i >= 1 && seq[i] === seq[i - 1] && (i === 1 || seq[i - 2] !== seq[i - 1]);

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
        marks.set(i, { kind: 'loss', stage: 1 });
        state = 'R2'; // double immédiat
      } else if (state === 'R2') {
        marks.set(i, { kind: 'loss', stage: 2 });
        state = 'WATCH_3'; // 2 bleus = zone de perte, on attend un nouveau signal
      } else if (state === 'R3') {
        marks.set(i, { kind: 'loss', stage: 3 });
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
