import { createContext, useContext } from 'react';
import { formatMoney, type Currency } from '../engine/money';

export const CurrencyContext = createContext<Currency>('DH');

/** Hook : renvoie une fonction de formatage liée à la devise courante. */
export function useMoney() {
  const currency = useContext(CurrencyContext);
  return (amount: number) => formatMoney(amount, currency);
}
