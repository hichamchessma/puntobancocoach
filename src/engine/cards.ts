// Cartes, sabot (shoe) et règles de tirage du Punto Banco

import type { Card, HandResult, Outcome, Suit } from './types';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

/** Valeur baccarat d'une carte : A=1, 2-9 = valeur, 10/J/Q/K = 0 */
export function cardValue(card: Card): number {
  return card.rank >= 10 ? 0 : card.rank;
}

/** Valeur d'une main = somme des cartes modulo 10 */
export function handValue(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + cardValue(c), 0) % 10;
}

export const RANK_LABELS: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠', H: '♥', D: '♦', C: '♣',
};

export function cardLabel(card: Card): string {
  return RANK_LABELS[card.rank] + SUIT_SYMBOLS[card.suit];
}

export function isRed(card: Card): boolean {
  return card.suit === 'H' || card.suit === 'D';
}

/**
 * Nom de fichier image de la carte (set memoryMaster) :
 * `card_<rang><couleur>.png` — rang: 1=As..10, j/q/k ; couleur: s/h/d/c.
 */
export function cardFileName(card: Card): string {
  const rank =
    card.rank === 1
      ? '1'
      : card.rank <= 10
        ? String(card.rank)
        : card.rank === 11
          ? 'j'
          : card.rank === 12
            ? 'q'
            : 'k';
  return `card_${rank}${card.suit.toLowerCase()}.png`;
}

export const CARD_BACK_FILE = 'card_back.png';

/** Crée un sabot de `decks` jeux (par défaut 8) puis le mélange (Fisher–Yates) */
export function createShoe(decks = 8): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (let rank = 1; rank <= 13; rank++) {
        cards.push({ rank, suit });
      }
    }
  }
  // mélange
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/**
 * Distribue une main complète à partir du sabot, en appliquant les règles
 * officielles de tirage de la 3e carte. Retourne le résultat et l'index suivant.
 */
export function dealHand(shoe: Card[], start: number): { result: HandResult; next: number } {
  let i = start;
  const take = (): Card => shoe[i++];

  // Distribution alternée : Joueur, Banquier, Joueur, Banquier
  const player: Card[] = [take(), take()];
  const banker: Card[] = [take(), take()];

  let pVal = handValue(player);
  let bVal = handValue(banker);

  const natural = pVal >= 8 || bVal >= 8;

  if (!natural) {
    // Règle du Joueur
    let playerThird: Card | null = null;
    if (pVal <= 5) {
      playerThird = take();
      player.push(playerThird);
      pVal = handValue(player);
    }

    // Règle du Banquier
    const bankerDraws = bankerShouldDraw(bVal, playerThird);
    if (bankerDraws) {
      banker.push(take());
      bVal = handValue(banker);
    }
  }

  const outcome: Outcome = pVal > bVal ? 'P' : bVal > pVal ? 'B' : 'T';

  return {
    result: { player, banker, playerValue: pVal, bankerValue: bVal, outcome, natural },
    next: i,
  };
}

/** Règle de tirage du banquier. playerThird = null si le joueur n'a pas tiré. */
function bankerShouldDraw(bankerValue: number, playerThird: Card | null): boolean {
  // Le joueur n'a pas tiré (il est resté à 6 ou 7) : le banquier tire sur 0-5.
  if (playerThird === null) {
    return bankerValue <= 5;
  }
  const p3 = cardValue(playerThird);
  switch (bankerValue) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return p3 !== 8;
    case 4:
      return p3 >= 2 && p3 <= 7;
    case 5:
      return p3 >= 4 && p3 <= 7;
    case 6:
      return p3 === 6 || p3 === 7;
    default: // 7
      return false;
  }
}
