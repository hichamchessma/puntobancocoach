// Backtest : on fait jouer le coach sur un sabot entier, en appliquant sa
// stratégie à la lettre, et on produit un bilan complet.

import { createShoe, dealHand } from './cards';
import {
  betPayout,
  computeAdvice,
  INITIAL_PROGRESSION,
  nextProgression,
  resolveBet,
} from './coach';
import type { CoachConfig, Outcome, Strategy } from './types';

export interface StratStat {
  bets: number;
  wins: number;
  losses: number;
  pushes: number;
  net: number;
}

export interface BacktestReport {
  hands: number;
  outcomes: { P: number; B: number; T: number };
  betsPlaced: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number; // wins / (wins + losses) — taux de prévisions justes
  hitRate: number; // betsPlaced / hands — % de coups joués
  staked: number;
  net: number;
  roi: number; // net / staked
  startStack: number;
  endStack: number;
  maxStack: number;
  minStack: number;
  maxDrawdown: number; // plus grosse baisse depuis un sommet
  busted: boolean;
  bustedAtHand: number | null;
  byStrategy: Record<Strategy, StratStat>;
  equity: number[]; // stack après chaque coup (pour mini-graphe)
}

const emptyStrat = (): StratStat => ({ bets: 0, wins: 0, losses: 0, pushes: 0, net: 0 });

export function simulateShoe(config: CoachConfig, maxHands = 200): BacktestReport {
  const shoe = createShoe(8);
  let idx = 0;
  let prog = { ...INITIAL_PROGRESSION };

  const outcomes: Outcome[] = [];
  let stack = config.stack;
  const startStack = config.stack;
  let maxStack = stack;
  let minStack = stack;
  let peak = stack;
  let maxDrawdown = 0;

  let betsPlaced = 0;
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let staked = 0;
  let net = 0;
  let busted = false;
  let bustedAtHand: number | null = null;

  const byStrategy: Record<Strategy, StratStat> = {
    zigzag: emptyStrat(),
    dragon: emptyStrat(),
    custom: emptyStrat(),
  };
  const equity: number[] = [];

  for (let h = 0; h < maxHands && idx + 6 <= shoe.length; h++) {
    const advice = computeAdvice(outcomes, config, prog);

    // distribue la main
    const { result, next } = dealHand(shoe, idx);
    idx = next;

    // mise du coach (si signal et pas encore ruiné)
    if (advice.action === 'bet' && advice.side && advice.amount > 0 && !busted) {
      const amount = Math.min(advice.amount, stack); // on ne mise pas plus que le stack
      if (amount > 0) {
        const res = resolveBet(advice.side, result.outcome);
        const payout = betPayout(advice.side, amount, res, result.bankerValue);
        stack += payout;
        net += payout;
        staked += amount;
        betsPlaced++;
        const strat = advice.strategy ?? 'zigzag';
        const s = byStrategy[strat];
        s.bets++;
        s.net += payout;
        if (res === 'win') {
          wins++;
          s.wins++;
        } else if (res === 'lose') {
          losses++;
          s.losses++;
        } else {
          pushes++;
          s.pushes++;
        }
      }
    }

    // progression virtuelle du coach (avance même hors mise réelle)
    if (advice.action === 'bet' && advice.side) {
      const res = resolveBet(advice.side, result.outcome);
      prog = nextProgression(advice.stage, advice.side, advice.strategy, advice.ruleId, res, config);
    }

    outcomes.push(result.outcome);

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

  const tally = outcomes.reduce(
    (a, o) => {
      a[o]++;
      return a;
    },
    { P: 0, B: 0, T: 0 } as { P: number; B: number; T: number },
  );

  return {
    hands: outcomes.length,
    outcomes: tally,
    betsPlaced,
    wins,
    losses,
    pushes,
    winRate: wins + losses > 0 ? wins / (wins + losses) : 0,
    hitRate: outcomes.length > 0 ? betsPlaced / outcomes.length : 0,
    staked,
    net,
    roi: staked > 0 ? net / staked : 0,
    startStack,
    endStack: stack,
    maxStack,
    minStack,
    maxDrawdown,
    busted,
    bustedAtHand,
    byStrategy,
    equity,
  };
}

/** Lance plusieurs sabots et agrège (pour une estimation plus stable). */
export function simulateMany(config: CoachConfig, shoes: number): BacktestReport[] {
  const reports: BacktestReport[] = [];
  for (let i = 0; i < shoes; i++) reports.push(simulateShoe(config));
  return reports;
}
