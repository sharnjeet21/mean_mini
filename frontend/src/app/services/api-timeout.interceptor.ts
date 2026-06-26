import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, timeout } from 'rxjs/operators';
import { throwError, TimeoutError } from 'rxjs';

export const apiTimeoutInterceptor: HttpInterceptorFn = (request, next) => (
  next(request).pipe(
    timeout(15000),
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
  )
);
