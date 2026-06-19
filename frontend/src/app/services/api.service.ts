import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface Itinerary {
  _id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  duration: string;
  budget: number;
  travelerCount: number;
  category: string;
  travelStyle: string;
  transportMode: string;
  accommodationType: string;
  budgetBreakdown: {
    transport: number;
    accommodation: number;
    food: number;
    activities: number;
    contingency: number;
  };
  description: string;
  stops?: Array<{ name: string; notes: string; order?: number }>;
  dailyPlan: any[];
  tripSummary: any;
  createdBy: User;
  isActive: boolean;
  bookings?: any[];
  favorites?: string[];
  reviews?: any[];
  engagement: {
    bookingCount: number;
    favoriteCount: number;
    ratingCount: number;
    averageRating: number;
    isFavorite: boolean;
    hasBooked: boolean;
  };
  createdAt: string;
}

export interface TripAnalysis {
  generatedAt: string;
  scores: {
    feasibility: number;
    completeness: number;
    pace: number;
    budget: number;
    sustainability: number;
  };
  metrics: {
    durationDays: number;
    travelerCount: number;
    plannedDays: number;
    activityCount: number;
    averageActivitiesPerDay: number;
    paceLabel: string;
    budgetPerDay: number;
    budgetPerTraveler: number;
    budgetPerTravelerPerDay: number;
    budgetBreakdownTotal: number;
    budgetVariance: number;
  };
  risks: Array<{ severity: string; code: string; title: string; message: string }>;
  recommendations: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  // Auth endpoints
  login(credentials: LoginRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials);
  }

  register(userData: RegisterRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, userData);
  }

  // Itinerary endpoints
  getItineraries(): Observable<Itinerary[]> {
    return this.http.get<Itinerary[]>(`${this.baseUrl}/itinerary`);
  }

  getItinerary(id: string): Observable<Itinerary> {
    return this.http.get<Itinerary>(`${this.baseUrl}/itinerary/${id}`);
  }

  createItinerary(itinerary: Partial<Itinerary>): Observable<Itinerary> {
    return this.http.post<Itinerary>(`${this.baseUrl}/itinerary`, itinerary);
  }

  updateItinerary(id: string, itinerary: Partial<Itinerary>): Observable<Itinerary> {
    return this.http.put<Itinerary>(`${this.baseUrl}/itinerary/${id}`, itinerary);
  }

  deleteItinerary(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/itinerary/${id}`);
  }

  bookItinerary(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/itinerary/${id}/book`, {});
  }

  getUserBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/itinerary/user/bookings`);
  }

  getFavorites(): Observable<Itinerary[]> {
    return this.http.get<Itinerary[]>(`${this.baseUrl}/itinerary/user/favorites`);
  }

  getTripAnalysis(id: string): Observable<TripAnalysis> {
    return this.http.get<TripAnalysis>(`${this.baseUrl}/itinerary/${id}/analysis`);
  }

  toggleFavorite(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/itinerary/${id}/favorite`, {});
  }

  cancelBooking(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/itinerary/${id}/book`);
  }

  submitReview(id: string, rating: number, comment: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/itinerary/${id}/reviews`, { rating, comment });
  }

  getItineraryAnalytics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/itinerary/analytics/overview`);
  }

  // User endpoints
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  updateUserRole(userId: string, role: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/users/${userId}/role`, { role });
  }

  // Role request endpoints
  requestAdminRole(reason: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/role-requests`, { 
      requestedRole: 'admin', 
      reason 
    });
  }

  getRoleRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/role-requests`);
  }

  reviewRoleRequest(requestId: string, status: string, reviewNotes?: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/role-requests/${requestId}/review`, {
      status,
      reviewNotes
    });
  }
}
