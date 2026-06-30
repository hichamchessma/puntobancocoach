import { cardFileName, cardLabel } from '../engine/cards';
import type { Card } from '../engine/types';

// Préfixe de base (gère le déploiement sous /puntobancocoach/ sur GitHub Pages)
const BASE = import.meta.env.BASE_URL;

export function cardImageSrc(card: Card): string {
  return `${BASE}cards/${cardFileName(card)}`;
}

export function PlayingCard({ card, third = false }: { card?: Card; third?: boolean }) {
  if (!card) return <div className="card--empty" />;
  return (
    <img
      className={`card-img ${third ? 'third' : ''}`}
      src={cardImageSrc(card)}
      alt={cardLabel(card)}
      draggable={false}
    />
  );
}
