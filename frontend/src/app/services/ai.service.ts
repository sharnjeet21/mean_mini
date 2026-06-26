import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface TrendingDestination {
  name: string;
  description: string;
}

export interface Attraction {
  name: string;
  description: string;
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
