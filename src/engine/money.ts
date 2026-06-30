// Devise et formatage des montants.

export type Currency = 'DH' | 'EUR' | 'USD';

export const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: 'DH', label: 'Dirham marocain', symbol: 'DH' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'USD', label: 'Dollar US', symbol: '$' },
];

/** Formate un montant selon la devise choisie. */
export function formatMoney(amount: number, currency: Currency): string {
  const n = Math.round(amount).toLocaleString('fr-FR');
  switch (currency) {
    case 'EUR':
      return `${n} €`;
    case 'USD':
      return `$${n}`;
    default:
      return `${n} DH`;
  }
}
