import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap, timeout } from 'rxjs/operators';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Task 9: Authentication service using JWT
@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = `${environment.apiUrl}/api/auth`;
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Reactive signal for current user
  currentUser = signal<AuthUser | null>(this.loadUser());

  // Toast shown on the login page after logout
  logoutMessage = signal<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {}

  private get storage(): Storage | null {
    if (!this.isBrowser || typeof globalThis.localStorage === 'undefined') return null;
    return typeof globalThis.localStorage.getItem === 'function' ? globalThis.localStorage : null;
  }

  private loadUser(): AuthUser | null {
    const storage = this.storage;
    if (!storage) return null;
    try {
      const u = storage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  get token(): string | null {
    return this.storage?.getItem('token') || null;
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
      timeout(15000),
      tap((res) => {
        const storage = this.storage;
        if (res.success && storage) {
          storage.setItem('token', res.token);
          storage.setItem('user', JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }
      }),
      catchError((error) => this.authError(error))
    );
  }

  // Task 9: Register — stores JWT in localStorage
  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/register`, { name, email, password }).pipe(
      timeout(15000),
      tap((res) => {
        const storage = this.storage;
        if (res.success && storage) {
          storage.setItem('token', res.token);
          storage.setItem('user', JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }
      }),
      catchError((error) => this.authError(error))
    );
  }

  private authError(error: any): Observable<never> {
    if (error instanceof TimeoutError) {
      return throwError(() => new Error('The server took too long to respond. Please try again.'));
    }
    if (error?.status === 0) {
      return throwError(() => new Error('The API server is unavailable. Please confirm it is running.'));
    }
    return throwError(() => error);
  }

  logout(): void {
    this.logoutMessage.set('You have been signed out successfully.');
    this.clearSession();
    this.router.navigate(['/login']);
  }

  clearSession(): void {
    const storage = this.storage;
    if (storage) {
      storage.removeItem('token');
      storage.removeItem('user');
    }
    this.currentUser.set(null);
  }
}
