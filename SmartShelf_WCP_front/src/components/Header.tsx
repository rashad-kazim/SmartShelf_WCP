import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Bell, Globe, Sun, Moon, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useGetNotificationsQuery, useUpdatePreferencesMutation } from '@/api/api';
import { cn } from '../utils/cn';
import Logo from './Logo';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from '@/i18n/config';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updatePreferences } from '@/features/auth/authSlice';
import { saveStoredAuth } from '@/features/auth/storage';

const LANGUAGES = [
  { label: 'EN', value: 'en' },
  { label: 'TR', value: 'tr' },
  { label: 'RU', value: 'ru' },
  { label: 'GE', value: 'ge' },
  { label: 'PL', value: 'pl' },
];

export default function Header({ isSidebarOpen, toggleSidebar, isDarkMode, toggleDarkMode }: { 
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}) {
  const { i18n, t } = useTranslation();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user, token, refreshToken } = useAppSelector((state) => state.auth);
  const currentLang = (i18n.resolvedLanguage ?? DEFAULT_LANGUAGE).toLowerCase();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const {
    data: notifications = [],
    isLoading: isNotificationsLoading,
    isError: isNotificationsError,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery();
  const [persistPreferences] = useUpdatePreferencesMutation();
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const pendingAckCount = notifications.filter(
    (notification) => notification.requiresAck && !notification.acknowledgedAt,
  ).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsLangOpen(false);
    setIsNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.preferences.language) {
      return;
    }

    const preferredLanguage = user.preferences.language.toLowerCase();
    if (preferredLanguage !== currentLang) {
      void i18n.changeLanguage(preferredLanguage);
    }
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, preferredLanguage);
    document.documentElement.lang = preferredLanguage;
  }, [currentLang, i18n, user?.preferences.language]);

  useEffect(() => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8080';
    if (!token || typeof window === 'undefined') {
      return;
    }

    const abortController = new AbortController();
    let stream: EventSource | null = null;

    const startStream = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/notifications/stream-token`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: abortController.signal,
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { data?: { token?: string } };
        const streamToken = payload.data?.token;
        if (!streamToken || abortController.signal.aborted) {
          return;
        }

        stream = new EventSource(`${apiBaseUrl}/api/v1/notifications/stream?stream_token=${encodeURIComponent(streamToken)}`);
        stream.addEventListener('notification', () => {
          void refetchNotifications();
        });
        stream.onerror = () => {
          stream?.close();
        };
      } catch {
        // silent reconnect on next mount
      }
    };

    void startStream();

    return () => {
      abortController.abort();
      stream?.close();
    };
  }, [refetchNotifications, token]);

  const handleLanguageChange = async (language: string) => {
    await i18n.changeLanguage(language);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    if (user?.preferences) {
      const nextPreferences = {
        ...user.preferences,
        language,
      };
      dispatch(updatePreferences(nextPreferences));
      if (token && refreshToken) {
        saveStoredAuth({
          user: {
            ...user,
            preferences: nextPreferences,
          },
          token,
          refreshToken,
        });
      }
      void persistPreferences(nextPreferences);
    }
    setIsLangOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-header-bg text-white border-b border-white/10 z-50 px-4 flex items-center justify-between transition-all">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-white/10 rounded-lg transition-all text-white cursor-pointer"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="min-w-[32px] h-8 flex items-center justify-center">
          <Logo className="h-full w-auto" />
        </div>
        <span className="font-bold text-lg hidden sm:block">SmartShelf.IO</span>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Language Selector */}
        <div className="relative" ref={langRef}>
          <button 
            onClick={() => {
              setIsNotificationsOpen(false);
              setIsLangOpen(!isLangOpen);
            }}
            data-testid="language-toggle"
            className="p-2 hover:bg-white/10 rounded-lg transition-all flex items-center gap-2 text-sm font-medium text-white cursor-pointer"
          >
            <Globe size={20} />
            <span className="hidden sm:inline">
              {LANGUAGES.find((lang) => lang.value === currentLang)?.label ?? currentLang.toUpperCase()}
            </span>
            <ChevronDown size={14} className={cn("transition-transform", isLangOpen && "rotate-180")} />
          </button>

          {isLangOpen && (
            <div className="absolute top-full right-0 mt-2 w-24 bg-surface border border-border rounded-xl shadow-lg overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => void handleLanguageChange(lang.value)}
                  data-testid={`language-option-${lang.value}`}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer",
                    currentLang === lang.value ? "text-brand-primary font-bold bg-brand-primary/5" : "text-text-primary"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={toggleDarkMode}
          data-testid="theme-toggle"
          className="p-2 hover:bg-white/10 rounded-lg transition-all text-white cursor-pointer"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              setIsLangOpen(false);
              setIsNotificationsOpen(!isNotificationsOpen);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-all relative text-white cursor-pointer"
            aria-label={t('notifications')}
          >
            <Bell size={20} />
            {unreadCount > 0 || pendingAckCount > 0 ? (
              <span
                className={cn(
                  'absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-header-bg',
                  pendingAckCount > 0 ? 'bg-danger' : 'bg-brand-primary',
                )}
              />
            ) : null}
          </button>

          {isNotificationsOpen ? (
            <NotificationsDropdown
              notifications={notifications}
              isLoading={isNotificationsLoading}
              isError={isNotificationsError}
              unreadCount={unreadCount}
              onRetry={() => void refetchNotifications()}
              onClose={() => setIsNotificationsOpen(false)}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
