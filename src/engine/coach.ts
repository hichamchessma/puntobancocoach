// Moteur de coaching : décide quoi miser, combien, et BORNE la progression.
// Philosophie : pas de martingale infinie. La progression est plafonnée par
// le nombre de paliers, la mise max, et un % du stack. À la fin → STOP / reset.

import { detectSignal, opposite, withoutTies } from './patterns';
import type { Advice, BetResult, CoachConfig, ProgressionState, Side } from './types';

export const DEFAULT_CONFIG: CoachConfig = {
  baseUnit: 200,
  stack: 25000,
  maxBet: 2500,
  maxStages: 3, // 3 paliers max puis reset forcé
  multipliers: [1, 2, 3], // progression douce (pas x2 systématique)
  zigzagMinLen: 4, // 4 résultats alternés = "2 tours"
  maxRiskPct: 0.15, // jamais plus de 15% du stack sur une seule mise
};

export const INITIAL_PROGRESSION: ProgressionState = {
  stage: 0,
  active: false,
  side: null,
};

/** Plafond effectif d'une mise unique */
export function effectiveCap(config: CoachConfig): number {
  return Math.min(config.maxBet, config.stack * config.maxRiskPct);
}

function roundChip(amount: number): number {
  return Math.max(0, Math.round(amount / 10) * 10);
}

/** Montant recommandé pour un palier donné, plafonné. */
export function stakeForStage(stage: number, config: CoachConfig): number {
  const idx = Math.min(stage, config.multipliers.length - 1);
  const mult = config.multipliers[idx] ?? 1;
  const raw = config.baseUnit * mult;
  return roundChip(Math.min(raw, effectiveCap(config)));
}

/**
 * Calcule le conseil pour le PROCHAIN coup à partir de l'historique,
 * de la config et de l'état de progression courant.
 */
export function computeAdvice(
  outcomes: import('./types').Outcome[],
  config: CoachConfig,
  prog: ProgressionState,
): Advice {
  const signal = detectSignal(outcomes, config.zigzagMinLen);
  const seq = withoutTies(outcomes);
  const last: Side | null = seq.length ? seq[seq.length - 1] : null;

  // Progression de récupération en cours
  if (prog.active) {
    if (prog.stage >= config.maxStages) {
      return {
        action: 'stop',
        side: null,
        amount: 0,
        stage: prog.stage,
        reason: 'Palier max atteint — STOP. On encaisse la perte et on repart à zéro.',
        signal,
        riskNote: 'Discipline : ne pas chasser. Pause conseillée.',
      };
    }
    // On continue de jouer le zigzag : opposé du dernier résultat
    const side: Side = last ? opposite(last) : (prog.side ?? 'B');
    const amount = stakeForStage(prog.stage, config);
    const capped = amount >= effectiveCap(config);
    return {
      action: 'bet',
      side,
      amount,
      stage: prog.stage,
      reason:
        prog.stage === 0
          ? `${signal.label} → on mise la continuation`
          : `Récupération palier ${prog.stage + 1}/${config.maxStages} sur le zigzag`,
      signal,
      riskNote: capped ? 'Mise plafonnée (mise max / risque stack).' : undefined,
    };
  }

  // Pas de progression : on démarre UNIQUEMENT sur un zigzag confirmé
  if (signal.kind === 'zigzag' && signal.recommend) {
    return {
      action: 'bet',
      side: signal.recommend,
      amount: stakeForStage(0, config),
      stage: 0,
      reason: `${signal.label} → on parie sur la continuation du zigzag`,
      signal,
    };
  }

  // Sinon on attend (on n'est pas obligé de jouer chaque coup)
  return {
    action: 'wait',
    side: signal.recommend,
    amount: 0,
    stage: 0,
    reason:
      signal.kind === 'streak'
        ? `${signal.label} — hors stratégie zigzag, on observe`
        : 'Pas de zigzag net : on attend le bon moment.',
    signal,
  };
}

/** Résout une mise contre un résultat. */
export function resolveBet(side: Side, outcome: import('./types').Outcome): BetResult {
  if (outcome === 'T') return 'push'; // les paris P/B sont rendus en cas d'égalité
  return outcome === side ? 'win' : 'lose';
}

/** Gain net d'une mise résolue (commission 5% sur le Banquier). */
export function betPayout(side: Side, amount: number, result: BetResult): number {
  if (result === 'push') return 0;
  if (result === 'lose') return -amount;
  return side === 'B' ? amount * 0.95 : amount; // commission banquier
}

/**
 * Fait évoluer l'état de progression après la résolution d'une mise.
 * win  -> reset (on encaisse, on repart à la base)
 * push -> inchangé (égalité, mise rendue)
 * lose -> palier suivant, sauf si on atteint maxStages -> reset forcé (anti-tilt)
 */
export function nextProgression(
  placedStage: number,
  placedSide: Side,
  result: BetResult,
  config: CoachConfig,
): ProgressionState {
  if (result === 'win') return { ...INITIAL_PROGRESSION };
  if (result === 'push') return { stage: placedStage, active: true, side: placedSide };
  const nextStage = placedStage + 1;
  if (nextStage >= config.maxStages) return { ...INITIAL_PROGRESSION }; // STOP forcé
  return { stage: nextStage, active: true, side: placedSide };
}
