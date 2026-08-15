// Stratégie "La Fourmi" : perdre le minimum, gagner le plus souvent.
//
// 3 leviers réels (les seuls que le jeu autorise) :
//  1) CÔTÉ à plus faible avantage maison sous la règle "sans commission, 6-moitié" :
//     Joueur (~1,27 %) < Banquier (~1,42 %). Bonus : Joueur est toujours payé
//     plein 1:1 -> aucune frustration "gros gain payé à moitié" (anti-tilt).
//  2) VOLUME minimal : mise à PLAT (aucune progression) + filtre d'entrée qui
//     saute une partie des coups -> la perte espérée absolue baisse d'autant.
//  3) Discipline de session : Stop-loss / Take-profit (gérés au niveau simu/jeu).
//
// Filtre d'entrée :
//  - 'hache'    : on ne mise QUE juste après un changement de couleur (le run
//                 courant fait 1) -> terrain haché, on évite d'empiler pendant
//                 les dragons. ~la moitié des coups.
//  - 'noDragon' : on mise sauf pendant un run >= 3 (on saute les dragons).
//  - 'always'   : on mise chaque coup.

import { createShoe, dealHand } from './cards';
import { betPayout } from './coach';
import { withoutTies } from './patterns';
import type { HichamReport } from './hichamStrat';
import type { Outcome, Side } from './types';

export type FourmiEntry = 'hache' | 'noDragon' | 'always';

export interface FourmiCfg {
  side: Side; // 'P' (Joueur) par défaut
  unit: number; // mise à plat
  entry: FourmiEntry; // filtre d'entrée
}

export function defaultFourmiCfg(base: number): FourmiCfg {
  return { side: 'P', unit: base, entry: 'hache' };
}

/** Longueur du run courant (nb de derniers résultats identiques). */
function currentRun(seq: Side[]): number {
  if (seq.length === 0) return 0;
  const last = seq[seq.length - 1];
  let n = 0;
  for (let i = seq.length - 1; i >= 0 && seq[i] === last; i--) n++;
  return n;
}

/** Mise du prochain coup, ou null si on saute (filtre / pas d'histo). */
export function nextFourmiBet(outcomes: Outcome[], cfg: FourmiCfg): { side: Side; amount: number } | null {
  if (cfg.unit <= 0) return null;
  const seq = withoutTies(outcomes);
  if (cfg.entry === 'always') {
    return seq.length >= 1 ? { side: cfg.side, amount: cfg.unit } : null;
  }
  if (seq.length < 2) return null; // filtres : besoin d'un minimum d'histo
  const run = currentRun(seq);
  if (cfg.entry === 'hache' && run !== 1) return null; // seulement juste après un changement
  if (cfg.entry === 'noDragon' && run >= 3) return null; // on saute les dragons
  return { side: cfg.side, amount: cfg.unit };
}

// ---- Simulation ----

export interface FourmiSimOpts extends FourmiCfg {
  hands: number;
  bankroll: number;
  shoeHands: number; // 0 = infini
  stopLoss?: number;
  takeProfit?: number;
}

export function simulateFourmi(opts: FourmiSimOpts): HichamReport {
  const cfg: FourmiCfg = { side: opts.side, unit: opts.unit, entry: opts.entry };
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

    const bet = nextFourmiBet(shoeOutcomes, cfg);

    const { result, next } = dealHand(shoe, idx);
    idx = next;
    handsInShoe++;
    const o = result.outcome;

    if (bet && bet.amount > 0) {
      if (o === 'T') {
        pushes++;
      } else {
        const win = o === bet.side;
        const payout = betPayout(bet.side, bet.amount, win ? 'win' : 'lose', result.bankerValue);
        stack += payout;
        net += payout;
        staked += bet.amount;
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

export function simulateFourmiMany(opts: FourmiSimOpts, runs: number): HichamReport[] {
  const out: HichamReport[] = [];
  for (let i = 0; i < runs; i++) out.push(simulateFourmi(opts));
  return out;
}
