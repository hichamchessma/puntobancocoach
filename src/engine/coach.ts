// Moteur de coaching : décide quoi miser, combien, et BORNE la progression.
// Philosophie : pas de martingale infinie. La progression est plafonnée par
// le nombre de paliers, la mise max, et un % du stack. À la fin → STOP / reset.

import {
  detectSignal,
  opposite,
  ruleMatchesTail,
  trailingStreak,
  trailingZigzag,
  withoutTies,
} from './patterns';
import type {
  Advice,
  BetResult,
  CoachConfig,
  ProgressionState,
  Side,
  Strategy,
} from './types';

export const DEFAULT_CONFIG: CoachConfig = {
  baseUnit: 200,
  stack: 25000,
  maxBet: 2500,
  maxStages: 3, // 3 paliers max puis reset forcé
  multipliers: [1, 2, 3], // progression douce (pas x2 systématique)
  zigzagMinLen: 4, // 4 résultats alternés = "2 tours"
  maxRiskPct: 0.15, // jamais plus de 15% du stack sur une seule mise
  playZigzag: true,
  playDragon: true,
  dragonMinLen: 4, // 4 mêmes résultats d'affilée = dragon confirmé
  currency: 'DH',
  customRules: [],
};

export const INITIAL_PROGRESSION: ProgressionState = {
  stage: 0,
  active: false,
  side: null,
  strategy: null,
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

/** Plafonne un montant libre (patterns custom) au cap effectif. */
export function clampStake(amount: number, config: CoachConfig): number {
  return roundChip(Math.min(Math.max(0, amount), effectiveCap(config)));
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
  const sideName = (s: Side) => (s === 'P' ? 'Joueur' : 'Banquier');
  const stepSide = (bet: 'continue' | 'break'): Side =>
    last ? (bet === 'continue' ? last : opposite(last)) : 'B';

  // 0) Progression d'un pattern personnalisé en cours (prioritaire)
  if (prog.active && prog.strategy === 'custom' && prog.ruleId) {
    const rule = config.customRules.find((r) => r.id === prog.ruleId && r.enabled);
    if (rule && prog.stage < rule.steps.length) {
      const step = rule.steps[prog.stage];
      return {
        action: 'bet',
        side: stepSide(step.bet),
        amount: clampStake(step.amount, config),
        stage: prog.stage,
        strategy: 'custom',
        ruleId: rule.id,
        reason: `${rule.name} — étape ${prog.stage + 1}/${rule.steps.length} (${step.bet === 'continue' ? 'on suit la couleur' : 'on parie la cassure'}).`,
        signal,
      };
    }
    return {
      action: 'stop',
      side: null,
      amount: 0,
      stage: prog.stage,
      strategy: null,
      reason: 'Pattern terminé — STOP, on repart à zéro (pas de chasse).',
      signal,
    };
  }

  // 1) Progression de récupération zigzag en cours
  if (prog.active && prog.strategy === 'zigzag') {
    if (prog.stage >= config.maxStages) {
      return {
        action: 'stop',
        side: null,
        amount: 0,
        stage: prog.stage,
        strategy: null,
        reason: 'Palier max atteint — STOP. On encaisse la perte et on repart à zéro.',
        signal,
        riskNote: 'Discipline : ne pas chasser. Pause conseillée.',
      };
    }
    const side: Side = last ? opposite(last) : (prog.side ?? 'B');
    const amount = stakeForStage(prog.stage, config);
    const capped = amount >= effectiveCap(config);
    return {
      action: 'bet',
      side,
      amount,
      stage: prog.stage,
      strategy: 'zigzag',
      reason:
        prog.stage === 0
          ? `${signal.label} → on mise la continuation du zigzag`
          : `Récupération palier ${prog.stage + 1}/${config.maxStages} sur le zigzag`,
      signal,
      riskNote: capped ? 'Mise plafonnée (mise max / risque stack).' : undefined,
    };
  }

  // 1bis) Démarrage d'un pattern personnalisé (prioritaire sur zigzag/dragon)
  if (last) {
    for (const rule of config.customRules) {
      if (!rule.enabled || rule.steps.length === 0 || rule.trigger.length < 2) continue;
      if (ruleMatchesTail(rule.trigger, seq)) {
        const step = rule.steps[0];
        return {
          action: 'bet',
          side: stepSide(step.bet),
          amount: clampStake(step.amount, config),
          stage: 0,
          strategy: 'custom',
          ruleId: rule.id,
          reason: `Pattern « ${rule.name} » déclenché → ${step.bet === 'continue' ? 'on suit la couleur' : 'on parie la cassure'}.`,
          signal,
        };
      }
    }
  }

  const zig = trailingZigzag(seq);
  const streak = trailingStreak(seq);

  // 2) Démarrage zigzag (chop confirmé)
  if (config.playZigzag && last && zig >= config.zigzagMinLen) {
    return {
      action: 'bet',
      side: opposite(last),
      amount: stakeForStage(0, config),
      stage: 0,
      strategy: 'zigzag',
      reason: `Zigzag confirmé (${zig} alternés) → on parie la continuation (opposé du dernier).`,
      signal,
    };
  }

  // 3) Dragon confirmé (跟龍) : on SUIT la série, mise à plat (pas de chasse)
  if (config.playDragon && last && streak >= config.dragonMinLen) {
    return {
      action: 'bet',
      side: last,
      amount: stakeForStage(0, config),
      stage: 0,
      strategy: 'dragon',
      reason: `Dragon ${sideName(last)} (${streak}) confirmé → on suit le dragon (跟龍). Mise à plat ; si le dragon casse, on arrête.`,
      signal,
    };
  }

  // 4) Sinon on attend (on n'est pas obligé de jouer chaque coup)
  return {
    action: 'wait',
    side: signal.recommend,
    amount: 0,
    stage: 0,
    strategy: null,
    reason:
      streak >= 2 && config.playDragon
        ? `Série ${last ? sideName(last) : ''} en formation (${streak}) — pas encore un dragon (seuil ${config.dragonMinLen}).`
        : zig >= 2 && config.playZigzag
          ? `Zigzag en formation (${zig}) — pas encore confirmé (seuil ${config.zigzagMinLen}).`
          : "Pas de motif net : on attend le bon moment.",
    signal,
  };
}

/** Résout une mise contre un résultat. */
export function resolveBet(side: Side, outcome: import('./types').Outcome): BetResult {
  if (outcome === 'T') return 'push'; // les paris P/B sont rendus en cas d'égalité
  return outcome === side ? 'win' : 'lose';
}

/**
 * Gain NET d'une mise résolue, règle "no commission / Banker 6 paie moitié" :
 * - Égalité (push) : 0 (mise rendue).
 * - Joueur gagne : +mise (1:1).
 * - Banquier gagne avec un total de 6 : +mise/2 (paie moitié).
 * - Banquier gagne autrement : +mise (1:1).
 * - Perdu : -mise.
 * `bankerValue` est requis pour appliquer la règle du 6 (sinon Banquier paie plein).
 */
export function betPayout(
  side: Side,
  amount: number,
  result: BetResult,
  bankerValue?: number,
): number {
  if (result === 'push') return 0;
  if (result === 'lose') return -amount;
  if (side === 'P') return amount;
  return bankerValue === 6 ? amount * 0.5 : amount; // Banquier
}

/**
 * Fait évoluer l'état de progression après la résolution d'une mise.
 *
 * - Dragon : mise à plat, AUCUNE chasse. Quoi qu'il arrive on revient à zéro
 *   (si le dragon continue, il sera redétecté au coup suivant ; s'il casse, stop).
 * - Zigzag :
 *     win  -> reset (on encaisse)
 *     push -> inchangé (égalité, mise rendue)
 *     lose -> palier suivant, sauf à maxStages -> reset forcé (anti-tilt)
 */
export function nextProgression(
  placedStage: number,
  placedSide: Side,
  strategy: Strategy | null,
  ruleId: string | undefined,
  result: BetResult,
  config: CoachConfig,
): ProgressionState {
  if (strategy === 'dragon') return { ...INITIAL_PROGRESSION };

  // Pattern personnalisé : progression le long des étapes de la règle.
  if (strategy === 'custom') {
    const rule = config.customRules.find((r) => r.id === ruleId);
    if (!rule || result === 'win') return { ...INITIAL_PROGRESSION };
    if (result === 'push')
      return { stage: placedStage, active: true, side: placedSide, strategy: 'custom', ruleId };
    const nextStage = placedStage + 1;
    if (nextStage >= rule.steps.length) return { ...INITIAL_PROGRESSION }; // fin des étapes
    return { stage: nextStage, active: true, side: placedSide, strategy: 'custom', ruleId };
  }

  // Zigzag
  if (result === 'win') return { ...INITIAL_PROGRESSION };
  if (result === 'push')
    return { stage: placedStage, active: true, side: placedSide, strategy: 'zigzag' };
  const nextStage = placedStage + 1;
  if (nextStage >= config.maxStages) return { ...INITIAL_PROGRESSION }; // STOP forcé
  return { stage: nextStage, active: true, side: placedSide, strategy: 'zigzag' };
}
