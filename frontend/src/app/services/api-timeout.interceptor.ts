import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, timeout } from 'rxjs/operators';
import { throwError, TimeoutError } from 'rxjs';

export const apiTimeoutInterceptor: HttpInterceptorFn = (request, next) => {
  const isAiGen = request.url.includes('/api/v1/ai/itinerary-draft') || 
                  request.url.includes('/api/v1/ai/travel-search') ||
                  request.url.includes('/api/v1/ai/extract-intent') ||
                  request.url.includes('/api/v1/ai/trending') ||
                  request.url.includes('/api/v1/ai/itinerary-suggestions');
  const timeoutMs = isAiGen ? 120000 : 15000;

  return next(request).pipe(
    timeout(timeoutMs),
    catchError((error) => {
      if (error instanceof TimeoutError) {
        return throwError(() => new HttpErrorResponse({
          status: 408,
          statusText: 'Request Timeout',
          url: request.url,
          error: { message: 'The server took too long to respond. Please try again.' },
        }));
      }
      return throwError(() => error);
    }),
  );
};
