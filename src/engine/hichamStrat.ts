// Simulation de la stratégie "hichamostratforbanker" sur N coups.
//
// Signal = nouvelle répétition (une colonne atteint 2 mêmes couleurs, la 1re
// colonne du sabot comprise). Mise TOUJOURS Banquier, progression 1-2-4-8 unités
// avec pause après l'étape 2 (2 bleus = zone de perte -> on attend un nouveau
// signal). Victoire = reset. Perte étape 4 = perte des 4 Banquier.
//
// Paiement réel : Banquier 1:1, sauf gagnant avec un 6 = moitié ; égalité = mise
// rendue (push, la stratégie ne bouge pas).

import { createShoe, dealHand } from './cards';
import { betPayout } from './coach';
import type { Side } from './types';

export interface HichamOpts {
  unit: number; // 1 unité (ex. 200 DH)
  hands: number; // nb de coups à simuler
  bankroll: number; // stack de départ
  shoeHands: number; // coups par sabot (0 = infini)
}

export interface HichamReport {
  hands: number;
  nonTie: number;
  bets: number;
  staked: number;
  net: number;
  roi: number;
  wins: number;
  losses: number;
  pushes: number;
  winsByStage: number[]; // [é1, é2, é3, é4]
  busts: number; // pertes étape 4 (les 4 Banquier perdus)
  startStack: number;
  endStack: number;
  maxStack: number;
  minStack: number;
  maxDrawdown: number;
  busted: boolean;
  bustedAtHand: number | null;
  equity: number[];
}

const MULT = [1, 2, 4, 8];

export function simulateHichamStrat(opts: HichamOpts): HichamReport {
  let shoe = createShoe(8);
  let idx = 0;
  let handsInShoe = 0;
  let seq: Side[] = []; // résultats hors égalité du sabot courant

  type State = 'WATCH_1' | 'R1' | 'R2' | 'WATCH_3' | 'R3' | 'R4';
  let state: State = 'WATCH_1';
  const stageOf: Record<'R1' | 'R2' | 'R3' | 'R4', number> = { R1: 1, R2: 2, R3: 3, R4: 4 };

  let stack = opts.bankroll;
  const startStack = stack;
  let maxStack = stack;
  let minStack = stack;
  let peak = stack;
  let maxDrawdown = 0;
  let staked = 0;
  let net = 0;
  let bets = 0;
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let busts = 0;
  let nonTie = 0;
  const winsByStage = [0, 0, 0, 0];
  const equity: number[] = [];
  let busted = false;
  let bustedAtHand: number | null = null;

  const newShoe = () => {
    shoe = createShoe(8);
    idx = 0;
    handsInShoe = 0;
    seq = [];
    state = 'WATCH_1';
  };

  for (let h = 0; h < opts.hands; h++) {
    if (opts.shoeHands > 0 && handsInShoe >= opts.shoeHands) newShoe();
    if (idx + 6 > shoe.length) {
      // cartes épuisées : on remélange (en infini on garde la road)
      shoe = createShoe(8);
      idx = 0;
      if (opts.shoeHands > 0) {
        handsInShoe = 0;
        seq = [];
        state = 'WATCH_1';
      }
    }

    const { result, next } = dealHand(shoe, idx);
    idx = next;
    handsInShoe++;
    const o = result.outcome;

    if (o === 'T') {
      if (state === 'R1' || state === 'R2' || state === 'R3' || state === 'R4') pushes++;
      equity.push(stack);
      continue; // l'égalité ne compte pas dans la road
    }

    nonTie++;
    seq.push(o);
    const i = seq.length - 1;
    let resolved = false;

    if (state === 'R1' || state === 'R2' || state === 'R3' || state === 'R4') {
      resolved = true;
      const stage = stageOf[state];
      const amount = opts.unit * MULT[stage - 1];
      const win = o === 'B';
      const payout = betPayout('B', amount, win ? 'win' : 'lose', result.bankerValue);
      stack += payout;
      net += payout;
      staked += amount;
      bets++;
      if (win) {
        wins++;
        winsByStage[stage - 1]++;
        state = 'WATCH_1';
      } else {
        losses++;
        if (state === 'R1') state = 'R2';
        else if (state === 'R2') state = 'WATCH_3';
        else if (state === 'R3') state = 'R4';
        else {
          busts++;
          state = 'WATCH_1';
        }
      }
    }

    if (!resolved && (state === 'WATCH_1' || state === 'WATCH_3')) {
      const sig = i >= 1 && seq[i] === seq[i - 1] && (i === 1 || seq[i - 2] !== seq[i - 1]);
      if (sig) state = state === 'WATCH_1' ? 'R1' : 'R3';
    }

    maxStack = Math.max(maxStack, stack);
    minStack = Math.min(minStack, stack);
    peak = Math.max(peak, stack);
    maxDrawdown = Math.max(maxDrawdown, peak - stack);
    equity.push(stack);
    if (!busted && stack <= 0) {
      busted = true;
      bustedAtHand = h + 1;
    }
  }

  return {
    hands: opts.hands,
    nonTie,
    bets,
    staked,
    net,
    roi: staked ? net / staked : 0,
    wins,
    losses,
    pushes,
    winsByStage,
    busts,
    startStack,
    endStack: stack,
    maxStack,
    minStack,
    maxDrawdown,
    busted,
    bustedAtHand,
    equity,
  };
}

export function simulateHichamMany(opts: HichamOpts, runs: number): HichamReport[] {
  const out: HichamReport[] = [];
  for (let i = 0; i < runs; i++) out.push(simulateHichamStrat(opts));
  return out;
}
