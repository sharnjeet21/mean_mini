import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CurrencyConversionInfo {
  rate: number;
  feePercent: number;
  isLive: boolean;
  lastUpdated: string;
}

export interface ConvertedAmount {
  symbol: string;
  amount: number;
}

// Static exchange rates (USD base). Update periodically or wire to a live API.
const RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  JPY: 149.0,
  AUD: 1.52,
  CAD: 1.36,
  SGD: 1.34,
  AED: 3.67,
  CHF: 0.90,
};

const SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  AED: 'د.إ',
  CHF: 'Fr',
};

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  readonly supportedCurrencies = Object.keys(RATES);

  private _currency$ = new BehaviorSubject<string>('USD');
  readonly currentCurrency$ = this._currency$.asObservable();

  get currentCurrency(): string {
    return this._currency$.value;
  }

  setCurrency(code: string): void {
    if (RATES[code]) this._currency$.next(code);
  }

  getSymbol(code: string): string {
    return SYMBOLS[code] || code;
  }

  /** Convert a USD amount to the currently selected currency. */
  convert(usdAmount: number): ConvertedAmount {
    const code = this._currency$.value;
    const rate = RATES[code] || 1;
    return {
      symbol: this.getSymbol(code),
      amount: Math.round(usdAmount * rate),
    };
  }

  getConversionInfo(): CurrencyConversionInfo {
    const code = this._currency$.value;
    return {
      rate: RATES[code] || 1,
      feePercent: 0,
      isLive: false,
      lastUpdated: 'Rates are static approximations — verify before booking.',
    };
  }
}
