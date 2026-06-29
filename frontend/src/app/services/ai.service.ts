import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

export interface TrendingDestination {
  name: string;
  description: string;
}

export interface Attraction {
  name: string;
  description: string;
}

// ── Fallback mock data shown when AI APIs are unavailable ──────────────────────
const FALLBACK_TRENDING: TrendingDestination[] = [
  { name: 'Kyoto, Japan',         description: 'Ancient temples, bamboo groves & world-class kaiseki dining.' },
  { name: 'Santorini, Greece',    description: 'Clifftop villages, volcanic beaches & legendary sunsets.' },
  { name: 'Patagonia, Argentina', description: 'Raw wilderness, glaciers & some of Earth\'s finest hiking.' },
  { name: 'Marrakech, Morocco',   description: 'Vibrant souks, palatial riads & rich Berber culture.' },
  { name: 'Queenstown, NZ',       description: 'Adventure capital of the world — skiing, bungee & fjords.' },
];

const FALLBACK_ATTRACTIONS: Attraction[] = [
  { name: 'Historic Old Town',         description: 'UNESCO-listed medieval streets and architectural gems.' },
  { name: 'Local Food Market',         description: 'Sample authentic street food and regional specialties.' },
  { name: 'Natural Landmark',          description: 'Breathtaking scenery and prime photography spots.' },
  { name: 'Cultural Museum',           description: 'Deep dive into local art, history and traditions.' },
  { name: 'Scenic Waterfront',         description: 'Relaxing promenades with panoramic water views.' },
];

// ── Cache TTLs ─────────────────────────────────────────────────────────────────
const TTL_TRENDING     = 24 * 60 * 60 * 1000; // 24 h
const TTL_IMAGES       = 60 * 60 * 1000;       // 1 h
const TTL_SUGGESTIONS  = 60 * 60 * 1000;       // 1 h
const TTL_ATTRACTIONS  = 60 * 60 * 1000;       // 1 h

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface RoutePlan {
  origin: string;
  destination: string;
  waypoints: Array<{ name: string; description: string }>;
  totalDistance: string;
  estimatedTravelTime: string;
  bestTransportMode: string;
  highlights: string[];
  routingAdvice: string;
}

export interface Hotel {
  name: string;
  type: string;
  estimatedPricePerNight: number;
  rating: number;
  description: string;
  location: string;
  amenities: string[];
}

export interface BudgetEstimate {
  totalEstimated: number;
  perPerson: number;
  currency: string;
  costLevel: string;
  breakdown: {
    transport: number;
    accommodation: number;
    food: number;
    activities: number;
    miscellaneous: number;
    [key: string]: number;
  };
  tips: string[];
}

export interface Flight {
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  estimatedPrice: number;
  cabinClass: string;
  notes: string;
}

export interface SmartPlanDayActivity {
  time: string;
  activity: string;
  description: string;
  location: string;
}

export interface SmartPlanDay {
  day: number;
  title: string;
  meals: { breakfast: string; lunch: string; dinner: string };
  activities: SmartPlanDayActivity[];
}

export interface SmartPlan {
  destination: string;
  duration: number;
  travelStyle: string;
  dailyPlan: SmartPlanDay[];
  estimatedBudget: { total: number; currency: string };
  recommendations: string[];
  packingTips: string[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private baseUrl = `${environment.apiUrl}/api/v1/ai`;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object = 'server',
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // ── localStorage helpers ──────────────────────────────────────────────────────
  private lsGet<T>(key: string): T | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(`ai_cache:${key}`);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(`ai_cache:${key}`);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  private lsSet<T>(key: string, data: T, ttlMs: number): void {
    if (!this.isBrowser) return;
    try {
      const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs };
      localStorage.setItem(`ai_cache:${key}`, JSON.stringify(entry));
    } catch {
      // localStorage might be full — silently ignore
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  getDestinationImage(place: string): Observable<{ url: string }> {
    const key = `image:${place.toLowerCase()}`;
    const cached = this.lsGet<{ url: string }>(key);
    if (cached) return of(cached);

    const params = new HttpParams().set('place', place);
    return this.http.get<{ url: string }>(`${this.baseUrl}/image`, { params }).pipe(
      tap(res => this.lsSet(key, res, TTL_IMAGES)),
      catchError((err) => {
        if (err?.status === 429) {
          return throwError(() => new Error('Too many requests — please wait a moment before trying again.'));
        }
        return throwError(() => err);
      }),
    );
  }

  getSuggestions(query: string): Observable<string[]> {
    const key = `suggestions:${query.toLowerCase()}`;
    const cached = this.lsGet<string[]>(key);
    if (cached) return of(cached);

    const params = new HttpParams().set('q', query);
    return this.http.get<{ suggestions: string[] }>(`${this.baseUrl}/suggestions`, { params }).pipe(
      map(res => res.suggestions),
      tap(data => this.lsSet(key, data, TTL_SUGGESTIONS)),
      catchError(err => {
        if (err?.status === 429) return throwError(() => new Error('Too many requests — please wait a moment before trying again.'));
        return of([]); // silent empty list on other errors
      })
    );
  }

  getTrendingDestinations(): Observable<TrendingDestination[]> {
    const key = 'trending';
    const cached = this.lsGet<TrendingDestination[]>(key);
    if (cached) return of(cached);

    return this.http.get<{ destinations: TrendingDestination[] }>(`${this.baseUrl}/trending`).pipe(
      map(res => res.destinations),
      tap(data => this.lsSet(key, data, TTL_TRENDING)),
      catchError(err => {
        if (err?.status === 429) return throwError(() => new Error('Too many requests — please wait a moment before trying again.'));
        // Return curated fallback so the UI always shows something
        return of(FALLBACK_TRENDING);
      })
    );
  }

  getItinerarySuggestions(place: string): Observable<Attraction[]> {
    const key = `attractions:${place.toLowerCase()}`;
    const cached = this.lsGet<Attraction[]>(key);
    if (cached) return of(cached);

    const params = new HttpParams().set('place', place);
    return this.http.get<{ attractions: Attraction[] }>(`${this.baseUrl}/itinerary-suggestions`, { params }).pipe(
      map(res => res.attractions),
      tap(data => this.lsSet(key, data, TTL_ATTRACTIONS)),
      catchError(err => {
        if (err?.status === 429) return throwError(() => new Error('Too many requests — please wait a moment before trying again.'));
        return of(FALLBACK_ATTRACTIONS);
      })
    );
  }
  /**
   * Get AI-powered route plan between two locations.
   */
  getRoutePlan(origin: string, destination: string, stops?: string): Observable<RoutePlan> {
    let params = new HttpParams()
      .set('origin', origin)
      .set('destination', destination);
    if (stops) params = params.set('stops', stops);
    return this.http.get<{ route: RoutePlan }>(`${this.baseUrl}/route-plan`, { params }).pipe(
      map(res => res.route),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Get AI-powered hotel suggestions for a destination.
   */
  getHotelSuggestions(place: string, budget?: number): Observable<Hotel[]> {
    let params = new HttpParams().set('place', place);
    if (budget) params = params.set('budget', budget);
    return this.http.get<{ hotels: Hotel[] }>(`${this.baseUrl}/hotel-suggestions`, { params }).pipe(
      map(res => res.hotels),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Get AI-powered budget estimate for a trip.
   */
  getBudgetEstimate(params: {
    destination: string;
    duration: number;
    travelerCount: number;
    travelStyle?: string;
  }): Observable<BudgetEstimate> {
    return this.http.post<{ estimate: BudgetEstimate }>(`${this.baseUrl}/budget-estimate`, params).pipe(
      map(res => res.estimate),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Get AI-simulated flight options between two cities.
   */
  getFlightInfo(from: string, to: string, date?: string): Observable<Flight[]> {
    let params = new HttpParams()
      .set('from', from)
      .set('to', to);
    if (date) params = params.set('date', date);
    return this.http.get<{ flights: Flight[] }>(`${this.baseUrl}/flight-info`, { params }).pipe(
      map(res => res.flights),
      catchError(err => this.handleError(err))
    );
  }

  /**
   * Generate a complete AI-powered day-by-day smart travel plan.
   */
  getSmartPlan(params: {
    destination: string;
    duration: number;
    travelerCount?: number;
    travelStyle?: string;
    interests?: string[];
  }): Observable<SmartPlan> {
    return this.http.post<{ plan: SmartPlan }>(`${this.baseUrl}/smart-plan`, params).pipe(
      map(res => res.plan),
      catchError(err => this.handleError(err))
    );
  }

  private handleError(err: any): Observable<never> {
    if (err?.status === 429) {
      return throwError(() => new Error('Too many requests — please wait a moment before trying again.'));
    }
    return throwError(() => err);
  }
}
