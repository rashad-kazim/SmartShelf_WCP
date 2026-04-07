'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react';
import '@/i18n/config';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';

interface AppErrorFallbackProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  fullScreen?: boolean;
  showDashboardAction?: boolean;
}

export default function AppErrorFallback({
  error,
  reset,
  fullScreen = false,
  showDashboardAction = false,
}: AppErrorFallbackProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background px-4 py-10',
        fullScreen ? 'min-h-screen' : 'min-h-[70vh]'
      )}
    >
      <Card className="w-full max-w-2xl border-danger/20 shadow-xl shadow-black/5">
        <CardContent className="flex flex-col items-center gap-6 px-8 py-12 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle size={34} />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-text-primary">{t('something_went_wrong')}</h1>
            <p className="mx-auto max-w-lg text-sm leading-6 text-text-muted">
              {t('please_refresh_page')}
            </p>
            {error?.digest ? (
              <p className="text-xs font-mono text-text-muted">Ref: {error.digest}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {reset ? (
              <Button onClick={reset}>
                <RefreshCcw size={18} />
                {t('try_again')}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t('refresh_page')}
            </Button>
            {showDashboardAction ? (
              <Button variant="ghost" onClick={() => window.location.assign('/')}>
                <Home size={18} />
                {t('back_to_dashboard')}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
