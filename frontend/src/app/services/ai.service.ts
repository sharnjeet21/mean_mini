import { Injectable, PLATFORM_ID, inject } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class AiService {
  private baseUrl = `${environment.apiUrl}/api`;
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  constructor(private http: HttpClient) {}

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
      catchError(() => of({ url: '' }))   // silent fallback — no image shown
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
}
