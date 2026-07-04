// Construction des "roads" (tableaux) du Punto Banco à partir des résultats.

import type { Outcome, Side } from './types';

export interface BigRoadCell {
  col: number;
  row: number;
  outcome: Side; // P ou B (les Tie sont marqués sur la cellule précédente)
  ties: number; // nombre de Tie consécutifs marqués sur cette cellule
}

const MAX_ROW = 6;

const key = (c: number, r: number) => `${c},${r}`;

/**
 * Big Road : chaque colonne est une série du même résultat. Un résultat
 * identique DESCEND toujours dans la colonne (jamais de "queue du dragon" :
 * une série de plus de 6 continue tout droit vers le bas → scroll vertical).
 * Un changement crée une nouvelle colonne. Les Tie sont comptés sur la dernière
 * cellule placée.
 */
export function buildBigRoad(outcomes: Outcome[]): BigRoadCell[] {
  const cells: BigRoadCell[] = [];
  let last: BigRoadCell | null = null;

  for (const o of outcomes) {
    if (o === 'T') {
      if (last) last.ties++;
      continue;
    }
    const side: Side = o;

    if (last === null) {
      last = { col: 0, row: 0, outcome: side, ties: 0 };
    } else if (side === last.outcome) {
      last = { col: last.col, row: last.row + 1, outcome: side, ties: 0 }; // on descend, toujours
    } else {
      last = { col: last.col + 1, row: 0, outcome: side, ties: 0 }; // changement : nouvelle colonne
    }
    cells.push(last);
  }

  return cells;
}

/**
 * Bead Plate : grille simple remplie de haut en bas puis de gauche à droite,
 * 6 lignes. Inclut les Tie comme cases à part entière.
 */
export interface BeadCell {
  col: number;
  row: number;
  outcome: Outcome;
}

export function buildBeadPlate(outcomes: Outcome[]): BeadCell[] {
  return outcomes.map((o, i) => ({
    outcome: o,
    col: Math.floor(i / MAX_ROW),
    row: i % MAX_ROW,
  }));
}

/** Nombre de P / B / T dans l'historique */
export function tallies(outcomes: Outcome[]) {
  return outcomes.reduce(
    (acc, o) => {
      acc[o]++;
      acc.total++;
      return acc;
    },
    { P: 0, B: 0, T: 0, total: 0 } as Record<Outcome | 'total', number>,
  );
}

// ===== Colonnes logiques (base des derived roads) =====

export interface RoadColumn {
  outcome: Side;
  /** une case par résultat ; valeur = nb de Tie marqués dessus */
  entries: number[];
}

/**
 * Découpe l'historique en colonnes logiques (séries). Contrairement à la
 * Big Road d'affichage, une longue série reste UNE seule colonne (pas de
 * "queue du dragon"), ce qui est indispensable au calcul des derived roads.
 */
export function buildColumns(outcomes: Outcome[]): RoadColumn[] {
  const cols: RoadColumn[] = [];
  for (const o of outcomes) {
    if (o === 'T') {
      const last = cols[cols.length - 1];
      if (last) last.entries[last.entries.length - 1]++;
      continue;
    }
    const side: Side = o;
    const last = cols[cols.length - 1];
    if (!last || last.outcome !== side) {
      cols.push({ outcome: side, entries: [0] });
    } else {
      last.entries.push(0);
    }
  }
  return cols;
}

// ===== Derived roads : Big Eye Boy / Small Road / Cockroach Pig =====

export type RoadColor = 'R' | 'B'; // Rouge (régulier) / Bleu (irrégulier)

/** Offsets de comparaison : Big Eye = 1, Small = 2, Cockroach = 3 */
export const DERIVED_OFFSETS = { bigEye: 1, small: 2, cockroach: 3 } as const;
export type DerivedKey = keyof typeof DERIVED_OFFSETS;

/**
 * Calcule la suite de marques rouge/bleu d'une derived road.
 * Rouge = "régularité" (le motif se répète), Bleu = "irrégularité".
 *
 * - Nouvelle colonne (changement) : on compare la longueur de la colonne qui
 *   vient de finir avec celle située `offset` colonnes plus à gauche.
 *   Égales -> rouge, sinon -> bleu.
 * - Continuation (on descend la série) : on regarde la colonne `offset` à
 *   gauche ; si elle a une case à la même profondeur -> rouge, sinon -> bleu.
 */
export function buildDerivedRoad(outcomes: Outcome[], offset: number): RoadColor[] {
  const cols = buildColumns(outcomes);
  const marks: RoadColor[] = [];

  for (let ci = 0; ci < cols.length; ci++) {
    const depth = cols[ci].entries.length;
    for (let ri = 0; ri < depth; ri++) {
      if (ci === 0 && ri === 0) continue; // tout premier résultat : pas de référence

      if (ri === 0) {
        // changement de colonne
        const justFinished = cols[ci - 1];
        const reference = cols[ci - 1 - offset];
        if (!reference) continue; // pas encore assez d'historique (avant le point de départ)
        marks.push(justFinished.entries.length === reference.entries.length ? 'R' : 'B');
      } else {
        // continuation de la série
        const reference = cols[ci - offset];
        if (!reference) continue;
        marks.push(reference.entries.length > ri ? 'R' : 'B');
      }
    }
  }
  return marks;
}

// ===== Placement générique en grille 6 lignes (pour les derived roads) =====

export interface DerivedCell {
  col: number;
  row: number;
  val: RoadColor;
}

/** Place une suite de couleurs en colonnes (même couleur empilée), wrap à 6 lignes. */
export function placeColors(seq: RoadColor[]): DerivedCell[] {
  const cells: DerivedCell[] = [];
  const occ = new Set<string>();
  let last: DerivedCell | null = null;
  let maxCol = -1;

  const place = (cell: DerivedCell): DerivedCell => {
    cells.push(cell);
    occ.add(key(cell.col, cell.row));
    if (cell.col > maxCol) maxCol = cell.col;
    return cell;
  };

  for (const v of seq) {
    if (last === null) {
      last = place({ col: 0, row: 0, val: v });
      continue;
    }
    if (v === last.val) {
      let col = last.col;
      let row = last.row + 1;
      if (row >= MAX_ROW || occ.has(key(col, row))) {
        col = last.col + 1;
        row = last.row;
        while (occ.has(key(col, row))) col++;
      }
      last = place({ col, row, val: v });
    } else {
      last = place({ col: maxCol + 1, row: 0, val: v });
    }
  }
  return cells;
}
