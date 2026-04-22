import { AppLanguage, TranslationDictionary } from '../translation.types';
import { AR_TRANSLATIONS } from './ar';
import { EN_TRANSLATIONS } from './en';

export const TRANSLATIONS: Record<AppLanguage, TranslationDictionary> = {
  en: EN_TRANSLATIONS,
  ar: AR_TRANSLATIONS,
};
