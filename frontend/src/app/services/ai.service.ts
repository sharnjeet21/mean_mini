import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl = `${environment.apiUrl}/api/ai`;

  constructor(private http: HttpClient) {}

  getItinerary(place: string): Observable<{ data: string[] }> {
    const params = new HttpParams().set('place', place);
    return this.http.get<{ data: string[] }>(`${this.apiUrl}/itinerary`, { params });
  }

  getAttractions(place: string): Observable<{ data: string[] }> {
    const params = new HttpParams().set('place', place);
    return this.http.get<{ data: string[] }>(`${this.apiUrl}/attractions`, { params });
  }

  getTrending(): Observable<{ data: string[] }> {
    return this.http.get<{ data: string[] }>(`${this.apiUrl}/trending`);
  }

  getSuggestions(query: string): Observable<{ data: string[] }> {
    const params = new HttpParams().set('q', query);
    return this.http.get<{ data: string[] }>(`${this.apiUrl}/suggestions`, { params });
  }
}
