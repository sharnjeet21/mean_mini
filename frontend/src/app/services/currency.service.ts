import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface CurrencyRates {
  [currencyCode: string]: number;
}

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  // Ponytail: Keeping it simple. Free API, cached in memory, simple conversion logic.
  private readonly API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';
  private readonly CACHE_KEY = 'ti_currency_rates';
  private readonly PREF_KEY = 'ti_currency_pref';
  private readonly CONVERSION_FEE = 0.02; // 2% markup

  private isBrowser: boolean;
  private rates: CurrencyRates = { USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79, AUD: 1.5, CAD: 1.35, JPY: 150 }; // Fallbacks
  private lastFetchedTimestamp: number | null = null;
  
  public readonly supportedCurrencies = ['USD', 'INR', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'];
  private currentCurrencySubject = new BehaviorSubject<string>('INR');
  public currentCurrency$ = this.currentCurrencySubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      const savedPref = localStorage.getItem(this.PREF_KEY);
      if (savedPref && this.supportedCurrencies.includes(savedPref)) {
        this.currentCurrencySubject.next(savedPref);
      }
      
      const cachedRates = localStorage.getItem(this.CACHE_KEY);
      if (cachedRates) {
        try {
          const parsed = JSON.parse(cachedRates);
          if (parsed && Date.now() - parsed.timestamp < 1000 * 60 * 60 * 12) { // 12 hr TTL
            this.rates = parsed.rates;
            this.lastFetchedTimestamp = parsed.timestamp;
          } else {
            this.fetchLiveRates();
          }
        } catch {
          this.fetchLiveRates();
        }
      } else {
        this.fetchLiveRates();
      }
    }
  }

  private fetchLiveRates(): void {
    if (!this.isBrowser) return;
    this.http.get<any>(this.API_URL).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      if (res && res.rates) {
        this.rates = res.rates;
        this.lastFetchedTimestamp = Date.now();
        localStorage.setItem(this.CACHE_KEY, JSON.stringify({
          rates: this.rates,
          timestamp: this.lastFetchedTimestamp
        }));
        // Trigger consumers to update
        this.currentCurrencySubject.next(this.currentCurrency);
      }
    });
  }

  get currentCurrency(): string {
    return this.currentCurrencySubject.getValue();
  }

  setCurrency(currency: string): void {
    if (this.supportedCurrencies.includes(currency)) {
      if (this.isBrowser) localStorage.setItem(this.PREF_KEY, currency);
      this.currentCurrencySubject.next(currency);
    }
  }

  /**
   * Converts a USD amount to the currently selected currency, adding the conversion fee.
   * If the target is USD, no fee is added.
   */
  convert(amountInUsd: number): { amount: number, symbol: string } {
    const target = this.currentCurrency;
    
    // Return original if no valid amount
    if (!amountInUsd || isNaN(amountInUsd)) return { amount: 0, symbol: this.getSymbol(target) };
    
    // No fee for base currency USD
    if (target === 'USD') return { amount: Math.round(amountInUsd), symbol: '$' };
    
    const rate = this.rates[target] || this.rates['INR']; // fallback to INR rate if unknown
    
    // Calculate raw converted amount
    const converted = amountInUsd * rate;
    
    // Apply 2% markup fee as requested
    const finalAmount = Math.round(converted * (1 + this.CONVERSION_FEE));
    
    return { amount: finalAmount, symbol: this.getSymbol(target) };
  }
  
  /**
   * Converts an amount from the currently selected currency back to USD (removing markup).
   * Used when saving user-entered budgets to the backend.
   */
  convertToUsd(amountInTarget: number): number {
    const target = this.currentCurrency;
    if (!amountInTarget || isNaN(amountInTarget)) return 0;
    if (target === 'USD') return amountInTarget;
    
    const rate = this.rates[target] || this.rates['INR'];
    const rawTarget = amountInTarget / (1 + this.CONVERSION_FEE);
    return Math.round(rawTarget / rate);
  }

  getSymbol(currency: string): string {
    switch (currency) {
      case 'INR': return '₹';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      case 'USD': case 'AUD': case 'CAD': return '$';
      default: return '$';
    }
  }

  getCurrencyName(currency: string): string {
    const names: Record<string, string> = {
      USD: 'US Dollar', INR: 'Indian Rupee', EUR: 'Euro',
      GBP: 'British Pound', AUD: 'Australian Dollar',
      CAD: 'Canadian Dollar', JPY: 'Japanese Yen'
    };
    return names[currency] || currency;
  }

  /**
   * Returns conversion transparency info for the UI banner.
   */
  getConversionInfo(): { rate: number; feePercent: number; lastUpdated: string; isLive: boolean } {
    const target = this.currentCurrency;
    const rate = this.rates[target] || 1;
    let lastUpdated = 'Using fallback rates';
    let isLive = false;

    if (this.lastFetchedTimestamp) {
      isLive = true;
      const agoMs = Date.now() - this.lastFetchedTimestamp;
      const mins = Math.floor(agoMs / 60000);
      if (mins < 1) lastUpdated = 'Just now';
      else if (mins < 60) lastUpdated = `${mins} min ago`;
      else {
        const hrs = Math.floor(mins / 60);
        lastUpdated = hrs === 1 ? '1 hr ago' : `${hrs} hrs ago`;
      }
    }

    return { rate, feePercent: this.CONVERSION_FEE * 100, lastUpdated, isLive };
  }
}
