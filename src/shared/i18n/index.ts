import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import ar from './locales/ar';
import ru from './locales/ru';

export type AppLocale = 'en' | 'ar' | 'ru';

export const APP_LOCALES: AppLocale[] = ['en', 'ar', 'ru'];

export function normalizeLocale(raw: string | null | undefined): AppLocale {
  if (raw === 'ar' || raw === 'ru') return raw;
  return 'en';
}

export function localeLabel(locale: AppLocale): string {
  if (locale === 'ar') return 'AR';
  if (locale === 'ru') return 'RU';
  return 'EN';
}

export function localeNativeName(locale: AppLocale): string {
  if (locale === 'ar') return 'العربية';
  if (locale === 'ru') return 'Русский';
  return 'English';
}

export const LOCALE_OPTIONS: Array<{
  id: AppLocale;
  code: string;
  name: string;
}> = [
  { id: 'en', code: 'EN', name: 'English' },
  { id: 'ar', code: 'AR', name: 'العربية' },
  { id: 'ru', code: 'RU', name: 'Русский' },
];

export function nextLocale(locale: AppLocale): AppLocale {
  const i = APP_LOCALES.indexOf(locale);
  return APP_LOCALES[(i + 1) % APP_LOCALES.length]!;
}

const stored = localStorage.getItem('zeengo_locale');
const initial = normalizeLocale(stored);

document.documentElement.lang = initial;
document.documentElement.dir = initial === 'ar' ? 'rtl' : 'ltr';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
    ru: { translation: ru },
  },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
