// Simulation de "stratTendance" : suivre la tendance actuelle, 2 styles.
//
// - ZIGZAG : dès le moindre changement (le dernier résultat diffère du précédent),
//   on parie que l'alternance continue -> on mise l'OPPOSÉ du dernier.
// - DRAGON : dès le moindre doublement (2 mêmes après un changement),
//   on parie que la série continue -> on mise la MÊME couleur que le dernier.
//
// Chaque style a ses 4 mises (progression 4 étapes, martingale : perd -> étape
// suivante en continuant de suivre la tendance ; gagne -> reset ; perte étape 4
// -> reset). Paiement réel (Banquier 6 = moitié, égalité = push).

import { createShoe, dealHand } from './cards';
import { betPayout } from './coach';
import { opposite } from './patterns';
import type { HichamReport } from './hichamStrat';
import type { Side } from './types';

export interface TendanceOpts {
  zigzag: boolean;
  zigzagStakes: number[]; // [é1, é2, é3, é4]
  dragon: boolean;
  dragonStakes: number[]; // [é1, é2, é3, é4]
  hands: number;
  bankroll: number;
  shoeHands: number; // 0 = infini
}

interface Armed {
  tendance: 'zig' | 'drag';
  stage: number; // 1..4
  side: Side;
  stakes: number[];
}

export function simulateStratTendance(opts: TendanceOpts): HichamReport {
  let shoe = createShoe(8);
  let idx = 0;
  let handsInShoe = 0;
  let seq: Side[] = [];
  let armed: Armed | null = null;

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
    armed = null;
  };

  const sideFor = (t: 'zig' | 'drag', last: Side): Side => (t === 'zig' ? opposite(last) : last);

  for (let h = 0; h < opts.hands; h++) {
    if (opts.shoeHands > 0 && handsInShoe >= opts.shoeHands) newShoe();
    if (idx + 6 > shoe.length) {
      shoe = createShoe(8);
      idx = 0;
      if (opts.shoeHands > 0) newShoe();
    }

    const { result, next } = dealHand(shoe, idx);
    idx = next;
    handsInShoe++;
    const o = result.outcome;

    if (o === 'T') {
      if (armed) pushes++;
      equity.push(stack);
      continue;
    }

    nonTie++;
    seq.push(o);
    const i = seq.length - 1;

    // 1) résoudre la mise armée sur ce coup
    if (armed) {
      const amount = armed.stakes[armed.stage - 1] ?? 0;
      const win = o === armed.side;
      const payout = betPayout(armed.side, amount, win ? 'win' : 'lose', result.bankerValue);
      stack += payout;
      net += payout;
      staked += amount;
      bets++;
      if (win) {
        wins++;
        winsByStage[armed.stage - 1]++;
        armed = null;
      } else {
        losses++;
        if (armed.stage < 4) {
          armed = {
            tendance: armed.tendance,
            stage: armed.stage + 1,
            side: sideFor(armed.tendance, o), // on continue à suivre la tendance
            stakes: armed.stakes,
          };
        } else {
          busts++;
          armed = null;
        }
      }
    }

    // 2) si libre, détecter une tendance à suivre pour le prochain coup
    if (!armed && i >= 1) {
      if (opts.zigzag && seq[i] !== seq[i - 1]) {
        armed = { tendance: 'zig', stage: 1, side: opposite(seq[i]), stakes: opts.zigzagStakes };
      } else if (opts.dragon && seq[i] === seq[i - 1] && (i < 2 || seq[i - 2] !== seq[i - 1])) {
        armed = { tendance: 'drag', stage: 1, side: seq[i], stakes: opts.dragonStakes };
      }
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
    vengeanceCycles: 0,
  };
}

export function simulateTendanceMany(opts: TendanceOpts, runs: number): HichamReport[] {
  const out: HichamReport[] = [];
  for (let i = 0; i < runs; i++) out.push(simulateStratTendance(opts));
  return out;
}
