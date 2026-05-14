import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  inject,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { TitleStrategy } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { apiResilienceInterceptor } from './core/http/api-resilience.interceptor';
import { TranslationService } from './core/i18n/translation.service';
import { AppTitleStrategy } from './core/i18n/app-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation()),
    provideAnimations(),
    provideHttpClient(withFetch(), withInterceptors([apiResilienceInterceptor, authInterceptor])),
    provideAppInitializer(() => inject(TranslationService).initialize()),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
