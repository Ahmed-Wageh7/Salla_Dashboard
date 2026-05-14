import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { timer, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TRANSIENT_STATUSES = new Set([0, 408, 429, 500, 502, 503, 504]);

function isRetryableRequest(error: unknown, method: string): error is HttpErrorResponse {
  return (
    error instanceof HttpErrorResponse &&
    RETRYABLE_METHODS.has(method.toUpperCase()) &&
    TRANSIENT_STATUSES.has(error.status)
  );
}

function normalizedMessage(error: HttpErrorResponse): string {
  const payload = error.error;

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: string }).message;
    if (message?.trim()) return message.trim();
  }

  if (typeof payload === 'string' && payload.trim()) return payload.trim();
  if (error.status === 0) return 'Network connection failed. Please check your internet connection.';
  if (error.status >= 500) return 'The server is temporarily unavailable. Please try again.';
  if (error.status === 404) return 'The requested resource could not be found.';
  if (error.status === 403) return 'You do not have permission to perform this action.';
  if (error.status === 401) return 'Your session expired. Please sign in again.';

  return error.message || 'An unexpected API error occurred.';
}

export const apiResilienceInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    retry({
      count: 2,
      delay: (error, retryIndex) => {
        if (!isRetryableRequest(error, req.method)) {
          return throwError(() => error);
        }

        return timer(250 * retryIndex);
      },
    }),
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      return throwError(
        () =>
          new HttpErrorResponse({
            error: {
              ...(error.error && typeof error.error === 'object' ? error.error : {}),
              message: normalizedMessage(error),
            },
            headers: error.headers,
            status: error.status,
            statusText: error.statusText,
            url: error.url ?? undefined,
          }),
      );
    }),
  );
