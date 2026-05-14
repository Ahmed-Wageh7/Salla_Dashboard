import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslationDictionary, TranslationParams, AppLanguage } from './translation.types';
import { TRANSLATIONS } from './translations';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly document = inject(DOCUMENT, { optional: true });
  private readonly storageKey = 'app.language';
  private readonly defaultLanguage: AppLanguage = 'en';
  private readonly languageState = signal<AppLanguage>(this.defaultLanguage);

  readonly language = computed(() => this.languageState());
  readonly isRtl = computed(() => this.language() === 'ar');
  readonly direction = computed<'ltr' | 'rtl'>(() => (this.isRtl() ? 'rtl' : 'ltr'));
  readonly locale = computed(() => (this.language() === 'ar' ? 'ar-SA' : 'en-US'));

  initialize(): void {
    this.setLanguage(this.resolveInitialLanguage(), { persist: false });
  }

  setLanguage(language: AppLanguage, options: { persist?: boolean } = {}): void {
    this.languageState.set(language);
    this.applyDocumentState(language);

    if (options.persist !== false && typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, language);
    }
  }

  toggleLanguage(): void {
    this.setLanguage(this.language() === 'en' ? 'ar' : 'en');
  }

  t(key: string, params?: TranslationParams): string {
    const dictionary = TRANSLATIONS[this.language()];
    const fallbackDictionary = TRANSLATIONS[this.defaultLanguage];
    const resolved =
      this.lookup(dictionary, key) ??
      this.lookup(fallbackDictionary, key) ??
      key;

    return this.interpolate(resolved, params);
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale(), options).format(value);
  }

  formatCurrency(value: number, currency = 'SAR', options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale(), {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      ...options,
    }).format(value);
  }

  formatDate(value: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.locale(), options).format(new Date(value));
  }

  private resolveInitialLanguage(): AppLanguage {
    const persisted = this.readPersistedLanguage();
    if (persisted) {
      return persisted;
    }

    if (typeof navigator !== 'undefined') {
      const browserLanguage = navigator.language.toLowerCase();
      return browserLanguage.startsWith('ar') ? 'ar' : 'en';
    }

    return this.defaultLanguage;
  }

  private readPersistedLanguage(): AppLanguage | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const storedLanguage = localStorage.getItem(this.storageKey);
    return storedLanguage === 'ar' || storedLanguage === 'en' ? storedLanguage : null;
  }

  private applyDocumentState(language: AppLanguage): void {
    if (!this.document?.documentElement) {
      return;
    }

    const direction = language === 'ar' ? 'rtl' : 'ltr';
    this.document.documentElement.lang = language;
    this.document.documentElement.dir = direction;
    this.document.body?.setAttribute('dir', direction);
    this.document.body?.classList.toggle('app-rtl', direction === 'rtl');
    this.document.body?.classList.toggle('app-ltr', direction === 'ltr');
  }

  private lookup(dictionary: TranslationDictionary, key: string): string | null {
    const value = key.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') {
        return null;
      }

      return (current as TranslationDictionary)[segment];
    }, dictionary);

    return typeof value === 'string' ? value : null;
  }

  private interpolate(template: string, params?: TranslationParams): string {
    if (!params) {
      return template;
    }

    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => {
      const value = params[token];
      return value === null || value === undefined ? '' : String(value);
    });
  }
}
