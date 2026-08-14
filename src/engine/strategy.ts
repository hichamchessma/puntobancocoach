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

// Config d'auto-jeu de stratTendance (mise à plat, suivre la tendance)
export interface AutoTendanceCfg {
  zigzag: boolean;
  zigzagBet: number;
  dragon: boolean;
  dragonBet: number;
}

/**
 * Rejoue stratTendance sur l'historique et renvoie la mise à placer au PROCHAIN
 * coup (mise à plat, on suit la tendance jusqu'à ce qu'elle casse). null = aucune.
 */
export function nextTendanceBet(
  outcomes: Outcome[],
  cfg: AutoTendanceCfg,
): { side: Side; amount: number; tendance: 'zig' | 'drag' } | null {
  const seq = withoutTies(outcomes);
  let armed: { tendance: 'zig' | 'drag'; side: Side } | null = null;
  const sideFor = (t: 'zig' | 'drag', last: Side): Side => (t === 'zig' ? opposite(last) : last);

  for (let i = 0; i < seq.length; i++) {
    if (armed) {
      if (seq[i] === armed.side) armed = { tendance: armed.tendance, side: sideFor(armed.tendance, seq[i]) };
      else armed = null;
    }
    if (!armed && i >= 1) {
      if (cfg.zigzag && seq[i] !== seq[i - 1]) armed = { tendance: 'zig', side: opposite(seq[i]) };
      else if (cfg.dragon && seq[i] === seq[i - 1] && (i < 2 || seq[i - 2] !== seq[i - 1]))
        armed = { tendance: 'drag', side: seq[i] };
    }
  }

  if (armed) {
    const amount = armed.tendance === 'zig' ? cfg.zigzagBet : cfg.dragonBet;
    return { side: armed.side, amount, tendance: armed.tendance };
  }
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
