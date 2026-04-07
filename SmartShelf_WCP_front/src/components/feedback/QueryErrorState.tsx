'use client';

import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';

interface QueryErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export default function QueryErrorState({
  title,
  description,
  onRetry,
  className,
}: QueryErrorStateProps) {
  const { t } = useTranslation();

  return (
    <Card className={cn('border-danger/20 bg-danger/5', className)}>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle size={26} />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">
            {title ?? t('load_error_title')}
          </h2>
          <p className="max-w-xl text-sm text-text-muted">
            {description ?? t('load_error_desc')}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <Button onClick={onRetry}>
              <RefreshCcw size={18} />
              {t('try_again')}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t('refresh_page')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
