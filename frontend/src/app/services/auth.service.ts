import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Task 9: Authentication service using JWT
@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'http://localhost:5000/api/auth';
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Reactive signal for current user
  currentUser = signal<AuthUser | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  private loadUser(): AuthUser | null {
    if (!this.isBrowser) return null;
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  get token(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('token');
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  get isAdmin(): boolean {
    const u = this.currentUser();
    return u?.role === 'admin' || u?.role === 'superadmin';
  }

  // Task 9: Login — stores JWT in localStorage
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap((res) => {
        if (res.success && this.isBrowser) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }
      })
    );
  }

  // Task 9: Register — stores JWT in localStorage
  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/register`, { name, email, password }).pipe(
      tap((res) => {
        if (res.success && this.isBrowser) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }
      })
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
