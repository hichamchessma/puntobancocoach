// Gestion d'état de la session : un reducer qui orchestre moteur de jeu,
// patterns, coach et stack. Le joueur mise lui-même (mode manuel) ou laisse
// le coach miser (mode coach). Le coach garde toujours sa progression "virtuelle".

import { createShoe, dealHand } from '../engine/cards';
import {
  betPayout,
  computeAdvice,
  DEFAULT_CONFIG,
  INITIAL_PROGRESSION,
  nextProgression,
  resolveBet,
} from '../engine/coach';
import type {
  Advice,
  Bet,
  Card,
  CoachConfig,
  Hand,
  HandResult,
  Outcome,
  ProgressionState,
  Side,
} from '../engine/types';

export type Mode = 'sim' | 'manual';
export type BetMode = 'coach' | 'manual'; // qui décide la mise

export interface PendingBet {
  side: Side;
  amount: number;
}

export interface SessionState {
  config: CoachConfig;
  hands: Hand[];
  progression: ProgressionState;
  stack: number;
  startStack: number;
  shoe: Card[];
  shoeIndex: number;
  mode: Mode;
  betMode: BetMode;
  pendingBet: PendingBet | null;
  past: Omit<SessionState, 'past'>[]; // pour undo
}

export function createInitialState(config: CoachConfig = DEFAULT_CONFIG): SessionState {
  return {
    config,
    hands: [],
    progression: { ...INITIAL_PROGRESSION },
    stack: config.stack,
    startStack: config.stack,
    shoe: createShoe(8),
    shoeIndex: 0,
    mode: 'sim',
    betMode: 'manual',
    pendingBet: null,
    past: [],
  };
}

export type Action =
  | { type: 'DEAL' } // simulateur : distribue une main
  | { type: 'RECORD'; outcome: Outcome } // manuel : on saisit un résultat
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_BET_MODE'; betMode: BetMode }
  | { type: 'SET_PENDING_BET'; bet: PendingBet | null }
  | { type: 'SET_CONFIG'; patch: Partial<CoachConfig> }
  | { type: 'NEW_SHOE' } // nouveau sabot : remet la road à zéro (garde stack)
  | { type: 'RESET_SESSION' } // tout remettre à zéro
  | { type: 'UNDO' };

/** Sélecteurs dérivés */
export const selectOutcomes = (s: SessionState): Outcome[] => s.hands.map((h) => h.outcome);
export const selectAdvice = (s: SessionState): Advice =>
  computeAdvice(selectOutcomes(s), s.config, s.progression);
export const selectLastHand = (s: SessionState): Hand | undefined => s.hands[s.hands.length - 1];

function snapshot(s: SessionState): Omit<SessionState, 'past'> {
  const { past: _past, ...rest } = s;
  return { ...rest };
}

/** Cœur : applique une main résolue (résultat + cartes éventuelles) à l'état. */
function applyHand(state: SessionState, result: HandResult, hasCards: boolean): SessionState {
  const outcomes = selectOutcomes(state);
  const advice = computeAdvice(outcomes, state.config, state.progression);

  // 1) Progression VIRTUELLE du coach : avance toujours (même si le joueur ne suit pas),
  //    pour que le conseil reste cohérent.
  let progression = state.progression;
  if (advice.action === 'bet' && advice.side) {
    const r = resolveBet(advice.side, result.outcome);
    progression = nextProgression(advice, r, state.config);
  }

  // 2) Mise RÉELLE qui touche le stack : coach (auto) ou joueur (manuel).
  let chosen: { side: Side; amount: number; stage: number } | null = null;
  if (state.betMode === 'coach') {
    if (advice.action === 'bet' && advice.side && advice.amount > 0)
      chosen = { side: advice.side, amount: advice.amount, stage: advice.stage };
  } else if (state.pendingBet && state.pendingBet.amount > 0) {
    chosen = { side: state.pendingBet.side, amount: state.pendingBet.amount, stage: 0 };
  }

  let bet: Bet | undefined;
  let stack = state.stack;
  if (chosen) {
    const amount = Math.min(chosen.amount, Math.max(0, stack));
    if (amount > 0) {
      const r = resolveBet(chosen.side, result.outcome);
      const net = betPayout(chosen.side, amount, r, hasCards ? result.bankerValue : undefined);
      stack = state.stack + net;
      bet = { side: chosen.side, amount, stage: chosen.stage, result: r, net };
    }
  }

  const hand: Hand = {
    id: state.hands.length,
    outcome: result.outcome,
    stackAfter: stack,
    bet,
    ...(hasCards
      ? {
          player: result.player,
          banker: result.banker,
          playerValue: result.playerValue,
          bankerValue: result.bankerValue,
          natural: result.natural,
        }
      : {}),
  };

  return {
    ...state,
    hands: [...state.hands, hand],
    stack,
    progression,
    pendingBet: null,
    past: [...state.past, snapshot(state)],
  };
}

export function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'DEAL': {
      let base = state;
      // Fin de sabot (mode limité) : on repart sur un nouveau sabot (road remise
      // à zéro, progression réinitialisée) mais on garde la bankroll.
      const limit = state.config.shoeHands;
      if (limit > 0 && state.hands.length >= limit) {
        base = {
          ...state,
          hands: [],
          progression: { ...INITIAL_PROGRESSION },
          shoe: createShoe(8),
          shoeIndex: 0,
          past: [],
        };
      }
      let { shoe, shoeIndex } = base;
      if (shoeIndex + 6 > shoe.length) {
        shoe = createShoe(8);
        shoeIndex = 0;
      }
      const { result, next } = dealHand(shoe, shoeIndex);
      const withShoe = { ...base, shoe, shoeIndex: next };
      return applyHand(withShoe, result, true);
    }

    case 'RECORD': {
      const result: HandResult = {
        player: [],
        banker: [],
        playerValue: 0,
        bankerValue: 0,
        outcome: action.outcome,
        natural: false,
      };
      return applyHand(state, result, false);
    }

    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'SET_BET_MODE':
      return { ...state, betMode: action.betMode, pendingBet: null };

    case 'SET_PENDING_BET':
      return { ...state, pendingBet: action.bet };

    case 'SET_CONFIG': {
      const config = { ...state.config, ...action.patch };
      // Si la partie n'a pas commencé, le stack suit la config.
      const notStarted = state.hands.length === 0;
      return {
        ...state,
        config,
        stack: notStarted ? config.stack : state.stack,
        startStack: notStarted ? config.stack : state.startStack,
      };
    }

    case 'NEW_SHOE':
      return {
        ...state,
        hands: [],
        progression: { ...INITIAL_PROGRESSION },
        shoe: createShoe(8),
        shoeIndex: 0,
        pendingBet: null,
        past: [],
      };

    case 'RESET_SESSION':
      return createInitialState(state.config);

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return { ...prev, past: state.past.slice(0, -1) } as SessionState;
    }

    default:
      return state;
  }
}
