import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import ar from './locales/ar';

const stored = localStorage.getItem('zeengo_locale');
const initial = stored === 'ar' ? 'ar' : 'en';

document.documentElement.lang = initial;
document.documentElement.dir = initial === 'ar' ? 'rtl' : 'ltr';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
