import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Attach Bearer token to every outgoing HTTP request and handle 401 auto-logout
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // Only attach token in the browser — localStorage is unavailable during SSR
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.token;

  // Clone request with Authorization header if token exists
  const clonedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(clonedReq).pipe(
    catchError((error) => {
      // If the server returns 401 (expired / invalid token), auto-logout
      if (error.status === 401 && token) {
        // Only logout if this was an authenticated request (not a public route 401)
        const isApiRoute = req.url.includes('/api/itinerary') || req.url.includes('/api/auth/me');
        if (isApiRoute) {
          auth.logout();
        }
      }
      return throwError(() => error);
    })
  );
};
