import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  loginSchema,
  type LoginFormValues,
} from '@/features/auth/validation/login.schema';
import { ApiClientError } from '@/shared/api/client';
import { useLocale } from '@/shared/hooks/useShellPrefs';
import { Button, FieldError, Input, Label, useToast } from '@/shared/ui';

const RUSSIA_HERO =
  'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&w=1600&q=80';

export function LoginPage() {
  const { t } = useTranslation();
  const { locale, toggleLocale } = useLocale();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: import.meta.env.DEV ? 'admin@zeengo.com' : '',
      password: import.meta.env.DEV ? 'Admin123!' : '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values.email, values.password);
      navigate('/', { replace: true });
    } catch (error) {
      push({
        tone: 'error',
        title: t('login.failed'),
        description:
          error instanceof ApiClientError
            ? error.message
            : t('login.checkCredentials'),
      });
    }
  });

  return (
    <div className="grid min-h-dvh bg-[var(--bg)] lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#111111] lg:flex lg:flex-col lg:justify-end lg:p-12">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${RUSSIA_HERO})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(160deg, rgba(17,17,17,0.55) 0%, rgba(17,17,17,0.25) 45%, rgba(17,17,17,0.75) 100%), radial-gradient(circle at 20% 20%, rgba(59,130,246,0.45) 0%, transparent 42%)',
          }}
          aria-hidden
        />
        <div className="relative text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            {t('brand')}
          </p>
          <h1 className="mt-3 max-w-md text-5xl font-extrabold leading-tight">
            {t('login.heroTitle')}
          </h1>
          <p className="mt-4 max-w-sm text-base text-white/80">
            {t('login.heroBody')}
          </p>
        </div>
      </section>

      <section className="relative flex items-center justify-center bg-[var(--bg)] p-6 text-[var(--ink)]">
        <button
          type="button"
          onClick={toggleLocale}
          className="absolute end-4 top-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
          aria-label={t('toggleLanguage')}
        >
          {locale === 'ar' ? 'AR' : 'EN'}
        </button>
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md space-y-5"
          noValidate
        >
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              {t('login.brandLabel')}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-[var(--ink)]">
              {t('login.welcome')}
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {t('login.subtitle')}
            </p>
          </div>
          <div>
            <Label htmlFor="email">{t('login.email')}</Label>
            <Input id="email" type="email" autoComplete="username" {...form.register('email')} />
            <FieldError message={form.formState.errors.email?.message} />
          </div>
          <div>
            <Label htmlFor="password">{t('login.password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
            <FieldError message={form.formState.errors.password?.message} />
          </div>
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            {t('login.submit')}
          </Button>
        </form>
      </section>
    </div>
  );
}
