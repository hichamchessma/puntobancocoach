// Gestion d'état de la session : un reducer qui orchestre moteur de jeu,
// patterns, coach et stack. Deux modes : simulateur (cartes réelles) et
// manuel (compagnon casino : on saisit les résultats de la table).

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
} from '../engine/types';

export type Mode = 'sim' | 'manual';

export interface SessionState {
  config: CoachConfig;
  hands: Hand[];
  progression: ProgressionState;
  stack: number;
  startStack: number;
  shoe: Card[];
  shoeIndex: number;
  mode: Mode;
  followCoach: boolean;
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
    followCoach: true,
    past: [],
  };
}

export type Action =
  | { type: 'DEAL' } // simulateur : distribue une main
  | { type: 'RECORD'; outcome: Outcome } // manuel : on saisit un résultat
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'TOGGLE_FOLLOW' }
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

  let bet: Bet | undefined;
  let stack = state.stack;
  let progression = state.progression;

  const shouldBet = state.followCoach && advice.action === 'bet' && advice.side && advice.amount > 0;
  if (shouldBet && advice.side) {
    const betResult = resolveBet(advice.side, result.outcome);
    const payout = betPayout(advice.side, advice.amount, betResult);
    stack = state.stack + payout;
    bet = { side: advice.side, amount: advice.amount, stage: advice.stage, result: betResult };
    progression = nextProgression(
      advice.stage,
      advice.side,
      advice.strategy,
      betResult,
      state.config,
    );
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
    past: [...state.past, snapshot(state)],
  };
}

export function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'DEAL': {
      let { shoe, shoeIndex } = state;
      if (shoeIndex + 6 > shoe.length) {
        shoe = createShoe(8);
        shoeIndex = 0;
      }
      const { result, next } = dealHand(shoe, shoeIndex);
      const withShoe = { ...state, shoe, shoeIndex: next };
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

    case 'TOGGLE_FOLLOW':
      return { ...state, followCoach: !state.followCoach };

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
