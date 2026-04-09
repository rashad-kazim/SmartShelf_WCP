'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useGetMeQuery, useUpdatePreferencesMutation } from '@/api/api';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '../utils/cn';
import { useAppSelector } from '../store/hooks';
import { useAppDispatch } from '@/store/hooks';
import PanelLoader from '@/components/loading/PanelLoader';
import { logout, setCredentials, syncAuthUser, updatePreferences } from '@/features/auth/authSlice';
import type { UserPreferences } from '@/features/auth/types';

interface AdminShellProps {
  children: ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const { data: meData, error: meError } = useGetMeQuery(undefined, {
    skip: isAuthResolved && !isAuthenticated,
  });
  const [persistPreferences] = useUpdatePreferencesMutation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const preferences = user?.preferences;
    if (!preferences) {
      return;
    }
    setIsDarkMode(preferences.theme === 'dark');
    setIsSidebarOpen(!preferences.sidebarCollapsed);
  }, [user?.preferences]);

  useEffect(() => {
    if (!isAuthResolved) {
      return;
    }
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthResolved, isAuthenticated, router]);

  useEffect(() => {
    if (!meData) {
      return;
    }

    dispatch(setCredentials({ user: meData.user }));
    dispatch(syncAuthUser(meData.user));
    setIsAuthResolved(true);
  }, [dispatch, meData]);

  useEffect(() => {
    if (meError && isAuthenticated) {
      dispatch(logout());
      setIsAuthResolved(true);
      router.replace('/login');
      return;
    }
    if (meError && !isAuthenticated) {
      setIsAuthResolved(true);
    }
  }, [dispatch, isAuthenticated, meError, router]);

  const handlePreferencesChange = async (nextPreferences: UserPreferences) => {
    dispatch(updatePreferences(nextPreferences));
    try {
      await persistPreferences(nextPreferences).unwrap();
    } catch {
      // local state intentionally remains optimistic
    }
  };

  const handleToggleSidebar = () => {
    if (!user?.preferences) {
      setIsSidebarOpen((previous) => !previous);
      return;
    }

    const nextCollapsed = isSidebarOpen;
    setIsSidebarOpen(!isSidebarOpen);
    void handlePreferencesChange({
      ...user.preferences,
      sidebarCollapsed: nextCollapsed,
    });
  };

  const handleToggleDarkMode = () => {
    if (!user?.preferences) {
      setIsDarkMode((previous) => !previous);
      return;
    }

    const nextTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    void handlePreferencesChange({
      ...user.preferences,
      theme: nextTheme,
    });
  };

  if (!isAuthResolved || (!isAuthenticated && !meError)) {
    return <PanelLoader minHeightClassName="min-h-screen" />;
  }

  if (!isAuthenticated) {
    return <PanelLoader minHeightClassName="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar isOpen={isSidebarOpen} toggle={handleToggleSidebar} />

      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 h-screen overflow-hidden pt-16',
          isSidebarOpen ? 'pl-64' : 'pl-20'
        )}
      >
        <Header
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={handleToggleSidebar}
          isDarkMode={isDarkMode}
          toggleDarkMode={handleToggleDarkMode}
        />

        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-grow p-6">{children}</div>
          <footer className="p-6 bg-surface border-t border-border">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-muted">
              <p>(c) 2026 SmartShelf.ai. {t('all_rights_reserved')}</p>
              <div className="flex items-center gap-6">
                <span>{t('version_1_0_0')}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-success rounded-full"></span>
                  <span>{t('server_status')}</span>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
