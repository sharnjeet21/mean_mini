import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Task 9: Attach Bearer token to every outgoing HTTP request
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  // Only attach token in the browser — localStorage is unavailable during SSR
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const token = auth.token;

  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(cloned).pipe(
      catchError((error) => {
        const isAuthEndpoint = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register');
        if (error?.status === 401 && !isAuthEndpoint) {
          auth.clearSession();
          router.navigate(['/login'], {
            queryParams: { reason: 'session-expired' },
          });
        }
        return throwError(() => error);
      }),
    );
  }

  return next(req);
};
