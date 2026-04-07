'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setCredentials } from '../features/auth/authSlice';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Logo from '../components/Logo';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { saveStoredAuth } from '@/features/auth/storage';
import { useLoginAdminMutation } from '@/api/api';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [loginAdmin, { isLoading: isLoggingIn }] = useLoginAdminMutation();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const response = await loginAdmin({ email, password }).unwrap();
      const authPayload = {
        user: response.user,
        token: response.access_token,
        refreshToken: response.refresh_token,
      };
      dispatch(setCredentials(authPayload));
      saveStoredAuth(authPayload);
      router.push('/');
    } catch (error) {
      const message =
        typeof error === 'object' && error && 'data' in error && typeof error.data === 'object' && error.data && 'message' in error.data
          ? String(error.data.message)
          : t('invalid_credentials');
      setErrorMessage(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md overflow-hidden">
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
