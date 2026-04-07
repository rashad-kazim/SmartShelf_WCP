'use client';

import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  FileText,
  Store,
  Users,
  VolumeX,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useAcknowledgeNotificationMutation,
  useMarkNotificationReadMutation,
  useSilenceNotificationMutation,
} from '@/api/api';
import type { NotificationCategory, NotificationItem } from '@/api/contracts';
import { cn } from '@/utils/cn';

interface NotificationListItemProps {
  notification: NotificationItem;
  compact?: boolean;
  onNavigate?: () => void;
}

const categoryMeta: Record<
  NotificationCategory,
  { icon: typeof Store; iconClassName: string; badgeClassName: string }
> = {
  store: {
    icon: Store,
    iconClassName: 'text-brand-primary',
    badgeClassName: 'bg-brand-primary/10',
  },
  report: {
    icon: FileText,
    iconClassName: 'text-success',
    badgeClassName: 'bg-success/10',
  },
  user: {
    icon: Users,
    iconClassName: 'text-warning',
    badgeClassName: 'bg-warning/15',
  },
  system: {
    icon: Bell,
    iconClassName: 'text-danger',
    badgeClassName: 'bg-danger/10',
  },
};

const severityClassNames = {
  info: 'bg-slate-100 text-slate-700',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-danger/10 text-danger',
  critical: 'bg-danger text-white',
} as const;

export default function NotificationListItem({
  notification,
  compact = false,
  onNavigate,
}: NotificationListItemProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const meta = categoryMeta[notification.category];
  const Icon =
    notification.severity === 'critical' || notification.severity === 'error'
      ? AlertTriangle
      : meta.icon;
  const [markRead, { isLoading: isMarkingRead }] = useMarkNotificationReadMutation();
  const [acknowledge, { isLoading: isAcknowledging }] = useAcknowledgeNotificationMutation();
  const [silence, { isLoading: isSilencing }] = useSilenceNotificationMutation();
  const isPendingAck = notification.requiresAck && !notification.acknowledgedAt;

  const navigateToNotification = async () => {
    if (!notification.isRead) {
      await markRead(notification.id);
    }

    onNavigate?.();
    router.push(notification.href);
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-transparent px-4 py-4 transition-all',
        !notification.isRead && 'bg-brand-primary/5',
        compact ? 'hover:bg-background/70' : 'hover:border-border hover:bg-background/70',
      )}
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => void navigateToNotification()}
          className="flex min-w-0 flex-1 items-start gap-4 text-left"
        >
          <div
            className={cn(
              'mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              meta.badgeClassName,
            )}
          >
            <Icon size={20} className={meta.iconClassName} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text-primary">{t(notification.titleKey)}</p>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]',
                      severityClassNames[notification.severity],
                    )}
                  >
                    {t(notification.severity)}
                  </span>
                  {isPendingAck ? (
                    <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-danger">
                      {t('pending_ack')}
                    </span>
                  ) : null}
                  {notification.acknowledgedAt ? (
                    <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-success">
                      {t('acknowledged')}
                    </span>
                  ) : null}
                  {notification.silencedAt ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-700">
                      {t('silenced')}
                    </span>
                  ) : null}
                </div>
                <p
                  className={cn(
                    'text-sm leading-6 text-text-muted',
                    compact ? 'line-clamp-2' : 'line-clamp-3',
                  )}
                >
                  {t(notification.descriptionKey)}
                </p>
              </div>
              {!notification.isRead ? (
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-primary" />
              ) : null}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                {t(notification.timeKey)}
              </span>
            </div>
          </div>
        </button>

        <div className="flex shrink-0 flex-col gap-2">
          {isPendingAck ? (
            <button
              type="button"
              onClick={() => void acknowledge(notification.id)}
              disabled={isAcknowledging}
              className="rounded-xl bg-success px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-success/90 disabled:opacity-60"
            >
              <span className="flex items-center gap-1.5">
                <CheckCheck size={14} />
                {t('ack')}
              </span>
            </button>
          ) : null}
          {!notification.requiresAck && notification.severity === 'warning' && !notification.silencedAt ? (
            <button
              type="button"
              onClick={() => void silence(notification.id)}
              disabled={isSilencing}
              className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-60"
            >
              <span className="flex items-center gap-1.5">
                <VolumeX size={14} />
                {t('silence')}
              </span>
            </button>
          ) : null}
          {!notification.isRead && !isPendingAck ? (
            <button
              type="button"
              onClick={() => void markRead(notification.id)}
              disabled={isMarkingRead}
              className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-text-primary transition-colors hover:bg-surface-muted disabled:opacity-60"
            >
              {t('mark_as_read')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
