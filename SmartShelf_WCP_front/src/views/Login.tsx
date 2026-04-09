'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setCredentials } from '../features/auth/authSlice';
import { LogIn, Eye, EyeOff, Globe, Sun, Moon, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Logo from '../components/Logo';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useGetMeQuery, useLoginAdminMutation } from '@/api/api';
import { DEFAULT_LANGUAGE } from '@/i18n/config';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

const LANGUAGES = [
  { label: 'EN', value: 'en' },
  { label: 'TR', value: 'tr' },
  { label: 'RU', value: 'ru' },
  { label: 'AZ', value: 'az' },
  { label: 'PL', value: 'pl' },
] as const;

type ThemeMode = 'light' | 'dark';

export default function Login() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [loginAdmin, { isLoading: isLoggingIn }] = useLoginAdminMutation();
  const { data: meData, isFetching: isCheckingSession } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const currentLanguage = ((i18n.resolvedLanguage ?? DEFAULT_LANGUAGE).toLowerCase() === 'ge'
    ? 'az'
    : (i18n.resolvedLanguage ?? DEFAULT_LANGUAGE).toLowerCase());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedLanguage = window.localStorage.getItem('wcp_login_language');
    const savedTheme = window.localStorage.getItem('wcp_login_theme');
    const nextLanguage = savedLanguage && LANGUAGES.some((item) => item.value === savedLanguage) ? savedLanguage : currentLanguage;
    const nextTheme = savedTheme === 'dark' ? 'dark' : 'light';
    if (nextLanguage !== currentLanguage) {
      void i18n.changeLanguage(nextLanguage);
    }
    document.documentElement.lang = nextLanguage;
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    setTheme(nextTheme);
  }, [currentLanguage, i18n]);

  useEffect(() => {
    if (!isCheckingSession && (isAuthenticated || meData?.user)) {
      router.replace('/');
    }
  }, [isAuthenticated, isCheckingSession, meData?.user, router]);

  const handleLanguageChange = async (language: string) => {
    await i18n.changeLanguage(language);
    document.documentElement.lang = language;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('wcp_login_language', language);
    }
    setIsLangOpen(false);
  };

  const handleThemeToggle = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('wcp_login_theme', nextTheme);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const response = await loginAdmin({ email, password }).unwrap();
      const authPayload = {
        user: response.user,
      };
      dispatch(setCredentials(authPayload));
      router.push('/');
    } catch (error) {
      let message = t('invalid_credentials');
      if (typeof error === 'object' && error && 'data' in error && typeof error.data === 'object' && error.data) {
        const envelope = error.data as {
          error?: {
            code?: string;
            message?: string;
          };
        };
        switch (envelope.error?.code) {
          case 'email_not_registered':
            message = t('email_not_registered');
            break;
          case 'password_incorrect':
            message = t('password_incorrect');
            break;
          case 'wcp_access_denied':
            message = t('wcp_access_denied');
            break;
          case 'invalid_credentials':
            message = t('invalid_credentials');
            break;
          case 'too_many_login_attempts':
            message = t('too_many_login_attempts');
            break;
          case 'invalid_session':
            message = t('invalid_session');
            break;
          default:
            message = getApiErrorMessage(error, t('invalid_credentials'), t);
        }
      } else {
        message = getApiErrorMessage(error, t('invalid_credentials'), t);
      }
      setErrorMessage(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed bottom-6 right-6 z-10 flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLangOpen((previous) => !previous)}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-text-primary cursor-pointer"
              aria-label="Language"
            >
              <Globe size={18} />
              <span className="text-sm font-medium">
                {LANGUAGES.find((item) => item.value === currentLanguage)?.label ?? currentLanguage.toUpperCase()}
              </span>
              <ChevronDown size={14} className={cn('transition-transform', isLangOpen && 'rotate-180')} />
            </button>

            {isLangOpen ? (
              <div className="absolute bottom-full right-0 mb-2 w-24 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                {LANGUAGES.map((language) => (
                  <button
                    key={language.value}
                    type="button"
                    onClick={() => void handleLanguageChange(language.value)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/10',
                      currentLanguage === language.value ? 'text-brand-primary font-semibold' : 'text-text-primary',
                    )}
                  >
                    {language.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleThemeToggle}
            className="rounded-xl border border-border bg-surface p-2 text-text-primary cursor-pointer"
            aria-label="Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

      <div className="w-full max-w-md overflow-hidden relative">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 flex items-center justify-center">
                <Logo className="w-full h-full" />
              </div>
              <span className="text-2xl font-bold text-brand-primary">SmartShelf.ai</span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-center mb-2">{t('welcome_back')}</h2>
          <p className="text-text-muted text-center mb-8">{t('enter_details')}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">{t('email')}</label>
              <input
                type="email"
                required
                data-testid="login-email"
                className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                placeholder={t('email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  data-testid="login-password"
                  className="w-full px-4 py-3 rounded-xl bg-surface-muted border border-border focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                  placeholder={t('password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-border text-brand-primary focus:ring-brand-primary" />
                <span>{t('remember_me')}</span>
              </label>
              <a href="#" className="text-brand-primary hover:underline font-medium">{t('forgot_password')}</a>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              data-testid="login-submit"
              className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogIn size={20} />
              {isLoggingIn ? t('loading') : t('sign_in')}
            </button>

            {errorMessage ? (
              <p className="text-sm font-medium text-danger">{errorMessage}</p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
