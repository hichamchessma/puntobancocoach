// Stratégie "3 Steps" : martingale continue sur 3 paliers (1-2-4), côté Joueur
// par défaut (Banquier possible). Deux niveaux de vengeance optionnels (OFF par
// défaut), chacun une ligne de 3 paliers personnalisable.
//
// - BASE : on mise le côté cible, 3 paliers. Victoire (à n'importe quel palier)
//   -> reset. Perte des 3 -> si vengeance niv.1 active, on y passe.
// - VENGEANCE 1 : ligne de 3 paliers. Victoire -> retour BASE. 2 pertes de suite
//   -> si vengeance niv.2 active, on y passe.
// - VENGEANCE 2 : ligne de 3 paliers. Victoire -> retour BASE. Perte -> retour BASE.
//
// Mise à chaque coup (continu). Égalité = push (on rejoue le même palier).

import { createShoe, dealHand } from './cards';
import { betPayout } from './coach';
import { withoutTies } from './patterns';
import type { HichamReport } from './hichamStrat';
import type { Outcome, Side } from './types';

export interface ThreeStepCfg {
  side: Side; // 'P' (Joueur) par défaut
  base: number[]; // 3 paliers
  v1On: boolean; // vengeance niveau 1 active
  v1: number[]; // 3 paliers
  v2On: boolean; // vengeance niveau 2 active
  v2: number[]; // 3 paliers
}

export function defaultThreeStepCfg(b: number): ThreeStepCfg {
  return {
    side: 'P',
    base: [b, b * 2, b * 4],
    v1On: false,
    v1: [b * 3, b * 6, b * 12],
    v2On: false,
    v2: [b * 8, b * 16, b * 32],
  };
}

export type StepMode = 'BASE' | 'V1' | 'V2';

function lineFor(cfg: ThreeStepCfg, m: StepMode): number[] {
  return m === 'V2' ? cfg.v2 : m === 'V1' ? cfg.v1 : cfg.base;
}

function replay(seq: Side[], cfg: ThreeStepCfg): { mode: StepMode; step: number } {
  let mode: StepMode = 'BASE';
  let step = 0;
  let v1streak = 0;
  for (const o of seq) {
    const line = lineFor(cfg, mode);
    if (o === cfg.side) {
      mode = 'BASE';
      step = 0;
      v1streak = 0;
    } else {
      step++;
      if (step >= line.length) {
        step = 0;
        if (mode === 'BASE') {
          mode = cfg.v1On ? 'V1' : 'BASE';
        } else if (mode === 'V1') {
          v1streak++;
          if (v1streak >= 2 && cfg.v2On) {
            mode = 'V2';
            v1streak = 0;
          } else mode = 'V1';
        } else {
          mode = 'BASE';
          v1streak = 0;
        }
      }
    }
  }
  return { mode, step };
}

export function nextThreeStepBet(
  outcomes: Outcome[],
  cfg: ThreeStepCfg,
): { side: Side; amount: number; mode: StepMode; step: number } | null {
  const seq = withoutTies(outcomes);
  const { mode, step } = replay(seq, cfg);
  const amount = lineFor(cfg, mode)[step] ?? 0;
  if (amount <= 0) return null;
  return { side: cfg.side, amount, mode, step };
}

// ---- Simulation ----

export interface ThreeStepSimOpts extends ThreeStepCfg {
  hands: number;
  bankroll: number;
  shoeHands: number;
  stopLoss?: number;
  takeProfit?: number;
}

export function simulateThreeStep(opts: ThreeStepSimOpts): HichamReport {
  const cfg: ThreeStepCfg = {
    side: opts.side,
    base: opts.base,
    v1On: opts.v1On,
    v1: opts.v1,
    v2On: opts.v2On,
    v2: opts.v2,
  };
  let shoe = createShoe(8);
  let idx = 0;
  let handsInShoe = 0;
  let shoeOutcomes: Outcome[] = [];

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
  const equity: number[] = [];
  let busted = false;
  let bustedAtHand: number | null = null;

  const newShoe = () => {
    shoe = createShoe(8);
    idx = 0;
    handsInShoe = 0;
    shoeOutcomes = [];
  };

  for (let h = 0; h < opts.hands; h++) {
    if (opts.shoeHands > 0 && handsInShoe >= opts.shoeHands) newShoe();
    if (idx + 6 > shoe.length) {
      shoe = createShoe(8);
      idx = 0;
      if (opts.shoeHands > 0) newShoe();
    }

    const bet = nextThreeStepBet(shoeOutcomes, cfg);

    const { result, next } = dealHand(shoe, idx);
    idx = next;
    handsInShoe++;
    const o = result.outcome;

    if (bet && bet.amount > 0) {
      const stake = Math.min(bet.amount, Math.max(0, stack));
      if (o === 'T') {
        pushes++;
      } else if (stake > 0) {
        const win = o === bet.side;
        const payout = betPayout(bet.side, stake, win ? 'win' : 'lose', result.bankerValue);
        stack += payout;
        net += payout;
        staked += stake;
        bets++;
        bestBet = Math.max(bestBet, payout);
        worstBet = Math.min(worstBet, payout);
        if (win) {
          wins++;
          curW++;
          curL = 0;
          if (curW > maxWinStreak) maxWinStreak = curW;
        } else {
          losses++;
          curL++;
          curW = 0;
          if (curL > maxLoseStreak) maxLoseStreak = curL;
        }
      }
    }

    if (o !== 'T') nonTie++;
    shoeOutcomes.push(o);

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
  };
}

export function simulateThreeStepMany(opts: ThreeStepSimOpts, runs: number): HichamReport[] {
  const out: HichamReport[] = [];
  for (let i = 0; i < runs; i++) out.push(simulateThreeStep(opts));
  return out;
}
