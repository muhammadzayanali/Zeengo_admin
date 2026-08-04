import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/shared/i18n';

type Theme = 'light' | 'dark';
type Locale = 'en' | 'ar';

const THEME_KEY = 'zeengo_theme';
const LOCALE_KEY = 'zeengo_locale';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  void i18n.changeLanguage(locale);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return {
    theme,
    toggleTheme: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
  };
}

export function useLocale() {
  const { i18n: i18nInstance } = useTranslation();
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(LOCALE_KEY);
    return stored === 'ar' ? 'ar' : 'en';
  });

  useEffect(() => {
    applyLocale(locale);
    localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    const onLang = (lng: string) => {
      setLocaleState(lng === 'ar' ? 'ar' : 'en');
    };
    i18nInstance.on('languageChanged', onLang);
    return () => {
      i18nInstance.off('languageChanged', onLang);
    };
  }, [i18nInstance]);

  return {
    locale,
    toggleLocale: () => setLocaleState((l) => (l === 'ar' ? 'en' : 'ar')),
  };
}

export function roleBadge(role?: string) {
  if (!role) return 'OPS';
  if (role === 'ops_manager') return 'OPS';
  return role.replace('_', ' ').toUpperCase();
}

export function useRoleLabel() {
  const { t } = useTranslation();
  return (role?: string) => {
    if (!role) return t('roles.staff');
    if (role === 'admin') return t('roles.admin');
    if (role === 'ops_manager') return t('roles.ops_manager');
    if (role === 'splizer') return t('roles.splizer');
    if (role === 'support') return t('roles.support');
    if (role === 'driver') return t('roles.driver');
    return role;
  };
}

export function initials(name?: string | null) {
  if (!name?.trim()) return 'Z';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'Z';
}
