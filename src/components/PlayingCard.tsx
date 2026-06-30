import { RANK_LABELS, SUIT_SYMBOLS, isRed } from '../engine/cards';
import type { Card } from '../engine/types';

export function PlayingCard({ card }: { card?: Card }) {
  if (!card) return <div className="card--empty" />;
  return (
    <div className={`card ${isRed(card) ? 'card--red' : 'card--black'}`}>
      <span className="card__rank">{RANK_LABELS[card.rank]}</span>
      <span className="card__suit">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}
