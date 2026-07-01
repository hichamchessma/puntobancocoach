// Détection de patterns sur l'historique des résultats.

import type { Outcome, PatternSignal, Side } from './types';

/** Garde uniquement P/B (les Tie sont neutres pour les patterns) */
export function withoutTies(outcomes: Outcome[]): Side[] {
  return outcomes.filter((o): o is Side => o === 'P' || o === 'B');
}

/** Côté opposé */
export function opposite(side: Side): Side {
  return side === 'P' ? 'B' : 'P';
}

/**
 * Longueur du zigzag en fin de séquence : nombre de résultats consécutifs
 * qui alternent (P,B,P,B...). 4 résultats alternés = "2 tours".
 */
export function trailingZigzag(seq: Side[]): number {
  if (seq.length < 2) return seq.length;
  let len = 1;
  for (let i = seq.length - 1; i > 0; i--) {
    if (seq[i] !== seq[i - 1]) len++;
    else break;
  }
  return len;
}

/** Transitions d'une suite : pour chaque paire adjacente, true si identique. */
export function transitionsOf<T>(seq: T[]): boolean[] {
  const t: boolean[] = [];
  for (let i = 1; i < seq.length; i++) t.push(seq[i] === seq[i - 1]);
  return t;
}

/**
 * Un pattern (forme rouge/bleu) matche-t-il la fin de la séquence ?
 * On compare uniquement les TRANSITIONS (même/différent), donc le motif est
 * direction-agnostique : il marche pour une série rouge comme pour une bleue.
 */
export function ruleMatchesTail(trigger: ('R' | 'B')[], seq: Side[]): boolean {
  const L = trigger.length;
  if (L < 2 || seq.length < L) return false;
  const tail = seq.slice(-L);
  const tShape = transitionsOf(tail);
  const rShape = transitionsOf(trigger);
  return tShape.length === rShape.length && tShape.every((v, i) => v === rShape[i]);
}

/** Longueur de la série identique en fin de séquence (P,P,P -> 3) */
export function trailingStreak(seq: Side[]): number {
  if (seq.length === 0) return 0;
  let len = 1;
  for (let i = seq.length - 1; i > 0; i--) {
    if (seq[i] === seq[i - 1]) len++;
    else break;
  }
  return len;
}

/**
 * Analyse l'historique et renvoie le signal prioritaire.
 * Stratégie par défaut : le ZIGZAG. Si la queue alterne sur >= zigzagMinLen
 * résultats, on parie que le zigzag continue → prochain coup = opposé du dernier.
 */
export function detectSignal(outcomes: Outcome[], zigzagMinLen: number): PatternSignal {
  const seq = withoutTies(outcomes);
  if (seq.length === 0) {
    return { kind: 'none', length: 0, recommend: null, label: 'Pas encore de données' };
  }

  const zig = trailingZigzag(seq);
  const streak = trailingStreak(seq);
  const last = seq[seq.length - 1];

  if (zig >= zigzagMinLen) {
    // le zigzag continue → on joue l'opposé du dernier résultat
    return {
      kind: 'zigzag',
      length: zig,
      recommend: opposite(last),
      label: `Zigzag confirmé (${zig} coups alternés)`,
    };
  }

  if (streak >= 4) {
    // série longue détectée — info seulement, pas la stratégie active
    return {
      kind: 'streak',
      length: streak,
      recommend: last, // suivre la série
      label: `Série longue ${last === 'P' ? 'Joueur' : 'Banquier'} (${streak})`,
    };
  }

  return {
    kind: 'none',
    length: Math.max(zig, streak),
    recommend: null,
    label: 'Aucun pattern net — on attend',
  };
}
