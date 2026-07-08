// Analyse "style chinois" du sabot : derived roads, régularité, motifs nommés,
// et côté qui prolonge la régularité. But pédagogique : montrer ce que les
// habitués regardent et SAVOIR QUAND ATTENDRE.

import { trailingStreak, trailingZigzag, withoutTies } from './patterns';
import { buildColumns, buildDerivedRoad, DERIVED_OFFSETS, type RoadColor } from './roads';
import type { Outcome, Side } from './types';

export type Regularity = 'chaotique' | 'mitigé' | 'régulier';

export interface NamedPattern {
  key: 'dragon' | 'single-chop' | 'double-chop' | 'none';
  label: string; // nom FR
  cnLabel: string; // nom chinois
  length: number;
}

export interface ShoeAnalysis {
  derived: Record<'bigEye' | 'small' | 'cockroach', RoadColor[]>;
  last: Partial<Record<'bigEye' | 'small' | 'cockroach', RoadColor>>;
  reds: number; // nb de derived roads dont la dernière marque est rouge (0..3)
  regularity: Regularity;
  pattern: NamedPattern;
  /** Côté qui maximise la régularité (rouge) si on le joue. Le "suivi" chinois. */
  follow: { side: Side; reds: number } | null;
  tips: string[];
}

const lastOf = <T>(arr: T[]): T | undefined => arr[arr.length - 1];

/** Combien de derived roads finissent en rouge si le prochain résultat = side */
function redsIfNext(outcomes: Outcome[], side: Side): number {
  const next = [...outcomes, side as Outcome];
  let reds = 0;
  for (const off of Object.values(DERIVED_OFFSETS)) {
    if (lastOf(buildDerivedRoad(next, off)) === 'R') reds++;
  }
  return reds;
}

function detectPattern(outcomes: Outcome[]): NamedPattern {
  const seq = withoutTies(outcomes);
  const streak = trailingStreak(seq);
  const zig = trailingZigzag(seq);

  if (streak >= 3) {
    return { key: 'dragon', label: `Dragon (${streak})`, cnLabel: '長龍', length: streak };
  }
  if (zig >= 3) {
    return { key: 'single-chop', label: `Ping-pong (${zig})`, cnLabel: '單跳', length: zig };
  }
  // double chop : dernières colonnes de longueur 2 (PP BB PP ...)
  const cols = buildColumns(outcomes);
  if (cols.length >= 3) {
    const tail = cols.slice(-3);
    if (tail.every((c) => c.entries.length === 2)) {
      return { key: 'double-chop', label: 'Double ping-pong', cnLabel: '雙跳', length: 3 };
    }
  }
  return { key: 'none', label: 'Aucun motif net', cnLabel: '—', length: 0 };
}

export function analyzeShoe(outcomes: Outcome[]): ShoeAnalysis {
  const derived = {
    bigEye: buildDerivedRoad(outcomes, DERIVED_OFFSETS.bigEye),
    small: buildDerivedRoad(outcomes, DERIVED_OFFSETS.small),
    cockroach: buildDerivedRoad(outcomes, DERIVED_OFFSETS.cockroach),
  };
  const last = {
    bigEye: lastOf(derived.bigEye),
    small: lastOf(derived.small),
    cockroach: lastOf(derived.cockroach),
  };
  const reds = [last.bigEye, last.small, last.cockroach].filter((c) => c === 'R').length;
  const known = [last.bigEye, last.small, last.cockroach].filter(Boolean).length;

  const regularity: Regularity = known < 2 ? 'chaotique' : reds >= 3 ? 'régulier' : reds === 2 ? 'mitigé' : 'chaotique';

  const pattern = detectPattern(outcomes);

  // côté qui prolonge la régularité
  let follow: ShoeAnalysis['follow'] = null;
  if (known >= 2) {
    const rP = redsIfNext(outcomes, 'P');
    const rB = redsIfNext(outcomes, 'B');
    if (rP !== rB) follow = rP > rB ? { side: 'P', reds: rP } : { side: 'B', reds: rB };
  }

  const tips = buildTips(regularity, pattern, follow, known);

  return { derived, last, reds, regularity, pattern, follow, tips };
}

const DERIVED_NAMES: Record<'bigEye' | 'small' | 'cockroach', { title: string; what: string }> = {
  bigEye: { title: 'Big Eye Boy · 大眼仔', what: 'compare la régularité colonne par colonne (décalage 1)' },
  small: { title: 'Small Road · 小路', what: 'même logique en sautant 1 colonne (décalage 2)' },
  cockroach: { title: 'Cockroach · 曱甴路', what: 'même logique en sautant 2 colonnes (décalage 3)' },
};

/** Explique la derived road courante + la conclusion à prendre. */
export function explainDerivedRoad(
  which: 'bigEye' | 'small' | 'cockroach',
  outcomes: Outcome[],
): { title: string; body: string } {
  const meta = DERIVED_NAMES[which];
  const marks = buildDerivedRoad(outcomes, DERIVED_OFFSETS[which]);

  if (marks.length === 0) {
    return {
      title: meta.title,
      body: `Cette road ${meta.what} pour dire si le sabot est RÉGULIER (rouge) ou CHAOTIQUE (bleu).\n\nPas encore assez de coups : elle démarre après quelques colonnes. ➡️ On observe.`,
    };
  }

  const reds = marks.filter((m) => m === 'R').length;
  const blues = marks.length - reds;
  const last = marks[marks.length - 1];
  let streak = 1;
  for (let i = marks.length - 1; i > 0; i--) {
    if (marks[i] === marks[i - 1]) streak++;
    else break;
  }
  const lastTxt = last === 'R' ? 'ROUGE (régulier)' : 'BLEU (irrégulier)';

  const body =
    `Cette road ${meta.what}, pour juger si le sabot est RÉGULIER (rouge = le motif se répète) ` +
    `ou CHAOTIQUE (bleu = imprévisible).\n\n` +
    `État actuel : ${reds} rouge · ${blues} bleu — dernière marque = ${lastTxt} (série de ${streak}).\n\n` +
    (last === 'R'
      ? `➡️ Conclusion : RÉGULIER ici. La tendance en cours (dragon / ping-pong) a tendance à se confirmer. Tu peux SUIVRE le motif, en mise à plat.`
      : `➡️ Conclusion : IRRÉGULIER ici. Lecture peu fiable, sabot imprévisible. Prudence : petite mise, ou on ATTEND un signal plus net.`);

  return { title: meta.title, body };
}

function buildTips(
  regularity: Regularity,
  pattern: NamedPattern,
  follow: ShoeAnalysis['follow'],
  known: number,
): string[] {
  const tips: string[] = [];

  if (known < 2) {
    tips.push("Sabot trop jeune : les derived roads ne sont pas encore lisibles. On observe.");
    return tips;
  }

  const actionable = pattern.key === 'dragon' || pattern.key === 'single-chop';

  if (regularity === 'régulier') {
    tips.push('🔴 Sabot RÉGULIER (3 rouges) : les habitués SUIVENT la tendance en confiance.');
  } else if (regularity === 'mitigé') {
    tips.push('🟠 Sabot MITIGÉ : signaux partagés. On suit avec une mise modérée.');
  } else if (actionable) {
    tips.push(
      '🔵 Sabot CHAOTIQUE : le motif peut casser à tout moment → on le suit, mais PRUDEMMENT (petite mise).',
    );
  } else {
    tips.push('🔵 Sabot CHAOTIQUE (bleus) : imprévisible. La sagesse chinoise = ATTENDRE.');
  }

  switch (pattern.key) {
    case 'dragon':
      tips.push(`🐉 Dragon en cours (${pattern.cnLabel}) : beaucoup "montent sur le dragon" (跟龍).`);
      break;
    case 'single-chop':
      tips.push(`🏓 Ping-pong (${pattern.cnLabel}) : alternance — ta stratégie zigzag s'applique.`);
      break;
    case 'double-chop':
      tips.push(`♊ Double ping-pong (${pattern.cnLabel}) : les paires s'enchaînent.`);
      break;
    default:
      tips.push('Pas de motif nommé : ne te force pas à jouer.');
  }

  if (follow) {
    const s = follow.side === 'P' ? 'Joueur' : 'Banquier';
    tips.push(`Si tu SUIS la régularité, le côté cohérent est ${s} (${follow.reds}/3 rouges).`);
  }

  return tips;
}
