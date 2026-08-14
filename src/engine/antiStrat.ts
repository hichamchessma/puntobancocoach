// Stratégie "Anti" : parier CONTRE la tendance (que le zigzag s'arrête / que le
// dragon casse), avec progression de paliers, vengeance niv.2 -> niv.1, et
// abandon (on suit la tendance à plat) quand tous les paliers ont perdu.
//
// - Anti-zigzag : on parie que ça va DOUBLER (zigzag s'arrête) -> mise MÊME
//   couleur que le dernier. Niv.2 : signal = 2 changements (3 derniers alternent),
//   3 paliers. Niv.1 (vengeance) : signal = 1 changement, 4 paliers. Si tous les
//   paliers perdent -> on suit le zigzag (mise OPPOSÉE, flat) jusqu'à ce qu'il casse.
// - Anti-dragon : on parie que la série CASSE -> mise couleur OPPOSÉE. Niv.1 :
//   signal = double, 4 paliers. Niv.2 : signal = triple, 3 paliers. Abandon -> on
//   suit le dragon (mise MÊME couleur, flat).
//
// Vengeance : on démarre en niv.2 (doux). Dès qu'une tentative perd entièrement
// (tous les paliers), niv.1 s'active pour `vengeance` cycles, puis retour niv.2.

import { createShoe, dealHand } from './cards';
import { betPayout } from './coach';
import { opposite, withoutTies } from './patterns';
import type { HichamReport } from './hichamStrat';
import type { Outcome, Side } from './types';

export interface AntiSide {
  enabled: boolean;
  useN2: boolean; // jouer le niveau 2 (doux)
  useN1: boolean; // jouer le niveau 1 (vengeance / plus agressif)
  levelsN2: number[]; // paliers niveau 2 (doux)
  levelsN1: number[]; // paliers niveau 1 (vengeance)
  vengeance: number; // nb de cycles en niv.1 après une perte
  follow: number; // mise à plat quand on suit la tendance (abandon)
}

export interface AntiCfg {
  antiZig: AntiSide;
  antiDrag: AntiSide;
}

export type AntiKind = 'antizig' | 'antidrag';
export interface AntiBet {
  side: Side;
  amount: number;
  kind: AntiKind;
  niveau: 1 | 2;
  level: number; // 0-based dans la progression, -1 = phase "suivi"
  follow: boolean;
}

interface ReplayParams {
  useN2: boolean;
  useN1: boolean;
  levelsN2: number[];
  levelsN1: number[];
  venN: number;
  followAmount: number;
  sigN2: (i: number) => boolean;
  sigN1: (i: number) => boolean;
  againstSide: (last: Side) => Side; // mise pendant la progression (contre la tendance)
  followSide: (last: Side) => Side; // mise pendant le suivi (avec la tendance)
}

function replayAnti(seq: Side[], p: ReplayParams): Omit<AntiBet, 'kind'> | null {
  let venLeft = 0;
  let phase: 'watch' | 'progress' | 'follow' = 'watch';
  let level = 0;
  let levels = p.useN2 ? p.levelsN2 : p.levelsN1;
  let niveau: 1 | 2 = p.useN2 ? 2 : 1;
  let pending: { side: Side; amount: number } | null = null;
  // niveau à jouer selon les niveaux activés (les 2 = strat complète : niv.2 puis
  // niv.1 en vengeance ; un seul = on force celui-là).
  const pickNiveau = (): 1 | 2 => {
    if (p.useN2 && p.useN1) return venLeft > 0 ? 1 : 2;
    return p.useN2 ? 2 : 1;
  };

  for (let i = 0; i < seq.length; i++) {
    if (pending) {
      const win = seq[i] === pending.side;
      if (phase === 'progress') {
        if (win) {
          if (venLeft > 0) venLeft--;
          phase = 'watch';
          pending = null;
        } else {
          level++;
          if (level < levels.length) {
            pending = { side: p.againstSide(seq[i]), amount: levels[level] };
          } else {
            venLeft = p.venN; // perte totale -> vengeance
            phase = 'follow';
            pending = { side: p.followSide(seq[i]), amount: p.followAmount };
          }
        }
      } else {
        // follow : on suit la tendance à plat jusqu'à ce qu'elle casse
        if (win) pending = { side: p.followSide(seq[i]), amount: p.followAmount };
        else {
          phase = 'watch';
          pending = null;
        }
      }
    }

    if (!pending && phase === 'watch') {
      niveau = pickNiveau();
      levels = niveau === 1 ? p.levelsN1 : p.levelsN2;
      const sig = niveau === 1 ? p.sigN1(i) : p.sigN2(i);
      if (sig) {
        level = 0;
        phase = 'progress';
        pending = { side: p.againstSide(seq[i]), amount: levels[0] };
      }
    }
  }

  if (!pending) return null;
  return { side: pending.side, amount: pending.amount, niveau, level: phase === 'follow' ? -1 : level, follow: phase === 'follow' };
}

// Config par défaut : on ne joue que le niveau 1 (agressif), suivi flat = 5 unités.
export function defaultAntiSide(base: number): AntiSide {
  return {
    enabled: true,
    useN2: false,
    useN1: true,
    levelsN2: [base, base * 2, base * 4],
    levelsN1: [base * 1.5, base * 3, base * 6, base * 12],
    vengeance: 4,
    follow: base * 5,
  };
}

export function defaultAntiCfg(base: number): AntiCfg {
  return { antiZig: defaultAntiSide(base), antiDrag: defaultAntiSide(base) };
}

export function nextAntiBet(outcomes: Outcome[], cfg: AntiCfg): AntiBet | null {
  const seq = withoutTies(outcomes);

  const zz = cfg.antiZig;
  if (zz.enabled && (zz.useN1 || zz.useN2)) {
    const z = replayAnti(seq, {
      useN2: zz.useN2,
      useN1: zz.useN1,
      levelsN2: zz.levelsN2,
      levelsN1: zz.levelsN1,
      venN: Math.max(0, zz.vengeance),
      followAmount: zz.follow,
      sigN2: (i) => i >= 2 && seq[i] !== seq[i - 1] && seq[i - 1] !== seq[i - 2],
      sigN1: (i) => i >= 1 && seq[i] !== seq[i - 1],
      againstSide: (last) => last, // même couleur = on parie le dédoublement
      followSide: (last) => opposite(last), // on suit le zigzag
    });
    if (z) return { ...z, kind: 'antizig' };
  }

  const dd = cfg.antiDrag;
  if (dd.enabled && (dd.useN1 || dd.useN2)) {
    const d = replayAnti(seq, {
      useN2: dd.useN2,
      useN1: dd.useN1,
      levelsN2: dd.levelsN2,
      levelsN1: dd.levelsN1,
      venN: Math.max(0, dd.vengeance),
      followAmount: dd.follow,
      sigN2: (i) => i >= 2 && seq[i] === seq[i - 1] && seq[i - 1] === seq[i - 2], // triple
      sigN1: (i) => i >= 1 && seq[i] === seq[i - 1], // double
      againstSide: (last) => opposite(last), // on casse la série
      followSide: (last) => last, // on suit le dragon
    });
    if (d) return { ...d, kind: 'antidrag' };
  }

  return null;
}

// ---- Simulation de la strat anti sur N coups (pour l'onglet Simulation) ----

export interface AntiSimOpts extends AntiCfg {
  hands: number;
  bankroll: number;
  shoeHands: number; // 0 = infini
}

export function simulateAntiStrat(opts: AntiSimOpts): HichamReport {
  const cfg: AntiCfg = { antiZig: opts.antiZig, antiDrag: opts.antiDrag };
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
  let vengeanceBets = 0;
  const equity: number[] = [];
  let busted = false;
  let bustedAtHand: number | null = null;
  const byT = {
    zig: { bets: 0, wins: 0, losses: 0, net: 0 },
    drag: { bets: 0, wins: 0, losses: 0, net: 0 },
  };

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

    const bet = nextAntiBet(shoeOutcomes, cfg); // mise pour ce coup, d'après l'histo du sabot

    const { result, next } = dealHand(shoe, idx);
    idx = next;
    handsInShoe++;
    const o = result.outcome;

    if (bet && bet.amount > 0) {
      if (o === 'T') {
        pushes++; // égalité = mise rendue
      } else {
        const win = o === bet.side;
        const payout = betPayout(bet.side, bet.amount, win ? 'win' : 'lose', result.bankerValue);
        stack += payout;
        net += payout;
        staked += bet.amount;
        bets++;
        if (bet.niveau === 1) vengeanceBets++;
        const t = bet.kind === 'antizig' ? byT.zig : byT.drag;
        t.bets++;
        t.net += payout;
        if (win) {
          wins++;
          t.wins++;
        } else {
          losses++;
          t.losses++;
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
    vengeanceCycles: vengeanceBets,
    byTendance: byT,
  };
}

export function simulateAntiMany(opts: AntiSimOpts, runs: number): HichamReport[] {
  const out: HichamReport[] = [];
  for (let i = 0; i < runs; i++) out.push(simulateAntiStrat(opts));
  return out;
}
