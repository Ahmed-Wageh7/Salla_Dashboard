import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/auth/login')
      ) {
        authService.logout();

        if (typeof window !== 'undefined' && !window.location.hash.includes('/login')) {
          void router.navigateByUrl('/login', { replaceUrl: true });
        }
      }

      return throwError(() => error);
    }),
  );
};
