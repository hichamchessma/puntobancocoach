// Types partagés du moteur Punto Banco

export type Outcome = 'P' | 'B' | 'T'; // Player, Banker, Tie
export type Side = 'P' | 'B'; // côté sur lequel on peut miser (pas de Tie dans la stratégie)

export type Suit = 'S' | 'H' | 'D' | 'C'; // Spades, Hearts, Diamonds, Clubs

export interface Card {
  rank: number; // 1..13 (A=1 ... K=13)
  suit: Suit;
}

export interface HandResult {
  player: Card[];
  banker: Card[];
  playerValue: number; // 0..9
  bankerValue: number; // 0..9
  outcome: Outcome;
  natural: boolean; // 8 ou 9 sur les 2 premières cartes
}

export type BetResult = 'win' | 'lose' | 'push';

export interface Bet {
  side: Side;
  amount: number;
  stage: number; // palier de progression (0 = mise de base)
  result?: BetResult;
  net?: number; // gain/perte net réellement appliqué au stack
}

export interface Hand {
  id: number;
  outcome: Outcome;
  // Cartes présentes uniquement en mode simulateur
  player?: Card[];
  banker?: Card[];
  playerValue?: number;
  bankerValue?: number;
  natural?: boolean;
  bet?: Bet; // mise effectivement jouée sur cette main (si pari placé)
  stackAfter: number; // stack après résolution
}

// Détection de patterns
export type PatternKind = 'zigzag' | 'streak' | 'none';

export interface PatternSignal {
  kind: PatternKind;
  length: number; // longueur du motif détecté (en résultats non-tie)
  // côté recommandé pour le PROCHAIN coup si on suit le signal
  recommend: Side | null;
  label: string; // texte humain
}

// Stratégies jouables par le coach
export type Strategy = 'zigzag' | 'dragon' | 'custom';

// ===== Règles / patterns personnalisés =====
// Un nœud de mise dans l'arbre de décision. "continue" = miser la même couleur
// que le dernier résultat (la série continue), "break" = miser la couleur
// opposée. Après résolution, onWin / onLose mènent soit à 'stop' (on arrête),
// soit à un autre nœud de mise (on enchaîne).
export interface BetNode {
  bet: 'continue' | 'break';
  amount: number;
  onWin: BetNode | 'stop';
  onLose: BetNode | 'stop';
}

// Un pattern personnalisé. Le `trigger` est une FORME relative (rouge=Banquier,
// bleu=Joueur) : seules les transitions (même/différent) comptent, donc le motif
// marche aussi bien pour une série rouge que bleue. `root` est l'arbre de mise.
export interface CustomRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: ('R' | 'B')[]; // au moins 2 pastilles
  root: BetNode; // arbre de décision de mise
}

// Conseil du coach pour le prochain coup
export type Action = 'bet' | 'wait' | 'stop';

export interface Advice {
  action: Action;
  side: Side | null;
  amount: number;
  stage: number;
  strategy: Strategy | null; // stratégie qui motive ce conseil
  ruleId?: string; // id de la règle custom si strategy === 'custom'
  path?: string; // chemin dans l'arbre de mise (suite de 'W'/'L') pour custom
  reason: string;
  signal: PatternSignal;
  riskNote?: string; // avertissement anti-tilt éventuel
}

export interface CoachConfig {
  baseUnit: number; // mise de base (ex. 200)
  stack: number; // stack de départ
  maxBet: number; // mise max autorisée (table / perso)
  maxStages: number; // nb de paliers de progression avant reset forcé
  multipliers: number[]; // multiplicateurs de mise par palier, ex [1, 2, 3]
  zigzagMinLen: number; // nb de résultats alternés requis pour déclencher (ex. 4 = "2 tours")
  maxRiskPct: number; // % max du stack engageable sur une mise unique (0..1)
  playZigzag: boolean; // stratégie zigzag active
  playDragon: boolean; // stratégie dragon (跟龍) active
  dragonMinLen: number; // longueur de série pour déclencher le dragon (ex. 4)
  currency: import('./money').Currency; // devise d'affichage
  customRules: CustomRule[]; // patterns personnalisés (prioritaires)
}

// État vivant de la progression du coach
export interface ProgressionState {
  stage: number; // palier / étape courante (0 = base)
  active: boolean; // une progression est en cours
  side: Side | null; // côté courant suivi par la progression
  strategy: Strategy | null; // stratégie de la progression en cours
  ruleId?: string; // règle custom en cours (si strategy === 'custom')
  path?: string; // position dans l'arbre de mise (suite de 'W'/'L')
}
