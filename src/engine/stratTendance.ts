// Simulation de "stratTendance" : suivre la tendance actuelle, en MISE À PLAT
// (aucune progression). 2 styles :
//
// - ZIGZAG : dès le moindre changement, on parie que l'alternance continue
//   -> on mise (à plat) l'OPPOSÉ du dernier, et on continue tant que ça alterne.
// - DRAGON : dès le moindre doublement (2 mêmes après un changement), on parie
//   que la série continue -> on mise (à plat) la MÊME couleur, et on continue
//   tant que la série tient.
//
// Une seule mise par tendance (le bet de départ). Tant qu'on gagne, on continue
// de suivre ; dès qu'on perd (la tendance casse), on s'arrête et on attend le
// prochain signal (l'autre tendance peut alors démarrer si elle est activée).
// Paiement réel (Banquier 6 = moitié, égalité = push).

import { createShoe, dealHand } from './cards';
import { betPayout } from './coach';
import { opposite } from './patterns';
import type { HichamReport } from './hichamStrat';
import type { Side } from './types';

export interface TendanceOpts {
  zigzag: boolean;
  zigzagBet: number; // mise à plat du zigzag
  dragon: boolean;
  dragonBet: number; // mise à plat du dragon
  hands: number;
  bankroll: number;
  shoeHands: number; // 0 = infini
  stopLoss?: number; // arrêt si la perte atteint ce montant (0 = off)
  takeProfit?: number; // arrêt si le gain atteint ce montant (0 = off)
}

type Tend = 'zig' | 'drag';

export function simulateStratTendance(opts: TendanceOpts): HichamReport {
  let shoe = createShoe(8);
  let idx = 0;
  let handsInShoe = 0;
  let seq: Side[] = [];
  let armed: { tendance: Tend; side: Side } | null = null;

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
  let nonTie = 0;
  const equity: number[] = [];
  let busted = false;
  let bustedAtHand: number | null = null;
  let bestBet = 0;
  let worstBet = 0;
  let curW = 0;
  let curL = 0;
  let maxWinStreak = 0;
  let maxLoseStreak = 0;
  let stoppedBy: 'tp' | 'sl' | null = null;
  let played = opts.hands;
  const stopLoss = opts.stopLoss ?? 0;
  const takeProfit = opts.takeProfit ?? 0;
  const byT: Record<Tend, { bets: number; wins: number; losses: number; net: number }> = {
    zig: { bets: 0, wins: 0, losses: 0, net: 0 },
    drag: { bets: 0, wins: 0, losses: 0, net: 0 },
  };

  const newShoe = () => {
    shoe = createShoe(8);
    idx = 0;
    handsInShoe = 0;
    seq = [];
    armed = null;
  };
  const sideFor = (t: Tend, last: Side): Side => (t === 'zig' ? opposite(last) : last);
  const betOf = (t: Tend) => (t === 'zig' ? opts.zigzagBet : opts.dragonBet);

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

    // 1) résoudre la mise à plat armée
    if (armed) {
      const t: Tend = armed.tendance;
      const amount = betOf(t);
      const win = o === armed.side;
      const payout = betPayout(armed.side, amount, win ? 'win' : 'lose', result.bankerValue);
      stack += payout;
      net += payout;
      staked += amount;
      bets++;
      bestBet = Math.max(bestBet, payout);
      worstBet = Math.min(worstBet, payout);
      byT[t].bets++;
      byT[t].net += payout;
      if (win) {
        wins++;
        byT[t].wins++;
        curW++;
        curL = 0;
        if (curW > maxWinStreak) maxWinStreak = curW;
        armed = { tendance: t, side: sideFor(t, o) }; // on continue de suivre (flat)
      } else {
        losses++;
        byT[t].losses++;
        curL++;
        curW = 0;
        if (curL > maxLoseStreak) maxLoseStreak = curL;
        armed = null; // la tendance a cassé
      }
    }

    // 2) si libre, démarrer une tendance sur le signal
    if (!armed && i >= 1) {
      if (opts.zigzag && seq[i] !== seq[i - 1]) {
        armed = { tendance: 'zig', side: opposite(seq[i]) };
      } else if (opts.dragon && seq[i] === seq[i - 1] && (i < 2 || seq[i - 2] !== seq[i - 1])) {
        armed = { tendance: 'drag', side: seq[i] };
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
    if (takeProfit > 0 && stack - startStack >= takeProfit) {
      stoppedBy = 'tp';
      played = h + 1;
      break;
    }
    if (stopLoss > 0 && startStack - stack >= stopLoss) {
      stoppedBy = 'sl';
      played = h + 1;
      break;
    }
  }

  return {
    hands: played,
    nonTie,
    bets,
    staked,
    net,
    roi: staked ? net / staked : 0,
    wins,
    losses,
    pushes,
    winsByStage: [wins, 0, 0, 0],
    busts: 0,
    startStack,
    endStack: stack,
    maxStack,
    minStack,
    maxDrawdown,
    busted,
    bustedAtHand,
    equity,
    vengeanceCycles: 0,
    bestBet,
    worstBet,
    maxWinStreak,
    maxLoseStreak,
    stoppedBy,
    byTendance: byT,
  };
}

export function simulateTendanceMany(opts: TendanceOpts, runs: number): HichamReport[] {
  const out: HichamReport[] = [];
  for (let i = 0; i < runs; i++) out.push(simulateStratTendance(opts));
  return out;
}
