import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  description: string;
  dailyPlan: any[];
  tripSummary: any;
  createdBy: User;
  isActive: boolean;
  bookings: any[];
  createdAt: string;
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
  private baseUrl = 'http://localhost:5000/api'; // Update this to match your backend URL

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
    return this.http.put(`${this.baseUrl}/role-requests/${requestId}`, {
      status,
      reviewNotes
    });
  }
}