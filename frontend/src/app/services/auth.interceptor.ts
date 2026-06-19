import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Attach the bearer token and recover cleanly from an expired session.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  // Only attach token in the browser — localStorage is unavailable during SSR
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.token;

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error) => {
      const isAuthEndpoint = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register');
      if (error?.status === 401 && token && !isAuthEndpoint) {
        auth.clearSession();
        router.navigate(['/login'], {
          queryParams: { reason: 'session-expired' },
        });
      }
      return throwError(() => error);
    }),
  );
};
