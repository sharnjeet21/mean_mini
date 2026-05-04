import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TrendingDestination {
  name: string;
  description: string;
}

export interface Attraction {
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private baseUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  getDestinationImage(place: string): Observable<{ url: string }> {
    const params = new HttpParams().set('place', place);
    return this.http.get<{ url: string }>(`${this.baseUrl}/image`, { params }).pipe(
      catchError(err => this.handleError(err))
    );
  }

  getSuggestions(query: string): Observable<string[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<{ suggestions: string[] }>(`${this.baseUrl}/suggestions`, { params }).pipe(
      map(res => res.suggestions),
      catchError(err => this.handleError(err))
    );
  }

  getTrendingDestinations(): Observable<TrendingDestination[]> {
    return this.http.get<{ destinations: TrendingDestination[] }>(`${this.baseUrl}/trending`).pipe(
      map(res => res.destinations),
      catchError(err => this.handleError(err))
    );
  }

  getItinerarySuggestions(place: string): Observable<Attraction[]> {
    const params = new HttpParams().set('place', place);
    return this.http.get<{ attractions: Attraction[] }>(`${this.baseUrl}/itinerary-suggestions`, { params }).pipe(
      map(res => res.attractions),
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
