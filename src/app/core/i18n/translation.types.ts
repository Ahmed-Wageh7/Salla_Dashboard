export type AppLanguage = 'en' | 'ar';

export type TranslationValue = string | TranslationDictionary;

export interface TranslationDictionary {
  [key: string]: TranslationValue;
}

export interface TranslationParams {
  [key: string]: string | number | boolean | null | undefined;
}
