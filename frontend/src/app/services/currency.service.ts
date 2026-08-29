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

// Static exchange rates (INR base). Update periodically or wire to a live API.
const RATES: Record<string, number> = {
  INR: 1.0,
  USD: 0.012, // 1 / 83.5
  EUR: 0.011,
  GBP: 0.0095,
  JPY: 1.78,
  AUD: 0.018,
  CAD: 0.016,
  SGD: 0.016,
  AED: 0.044,
  CHF: 0.011,
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

  private _currency$ = new BehaviorSubject<string>('INR');
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

  /** Convert a base INR amount to the currently selected currency. */
  convert(baseAmount: number): ConvertedAmount {
    const code = this._currency$.value;
    const rate = RATES[code] || 1;
    return {
      symbol: this.getSymbol(code),
      amount: Math.round(baseAmount * rate),
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
