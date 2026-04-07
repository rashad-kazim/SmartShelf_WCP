'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NotificationItem } from '@/api/contracts';
import QueryErrorState from '@/components/feedback/QueryErrorState';
import NotificationListItem from './NotificationListItem';

interface NotificationsDropdownProps {
  notifications: NotificationItem[];
  isLoading: boolean;
  isError: boolean;
  unreadCount: number;
  onRetry: () => void;
  onClose: () => void;
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-3 p-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-start gap-4 rounded-2xl px-3 py-4">
          <div className="h-11 w-11 rounded-2xl bg-surface-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded-full bg-surface-muted" />
            <div className="h-3 w-full rounded-full bg-surface-muted" />
            <div className="h-3 w-1/2 rounded-full bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsDropdown({
  notifications,
  isLoading,
  isError,
  unreadCount,
  onRetry,
  onClose,
}: NotificationsDropdownProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const latestNotifications = notifications.slice(0, 4);
  const pendingAckCount = notifications.filter(
    (notification) => notification.requiresAck && !notification.acknowledgedAt,
  ).length;

  return (
    <div className="absolute right-0 top-full z-50 mt-3 flex max-h-[50vh] w-[30rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl shadow-black/10">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-text-primary">{t('latest_notifications')}</p>
            <p className="mt-1 text-xs leading-5 text-text-muted">{t('notifications_desc')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 ? (
              <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
                {unreadCount} {t('unread')}
              </span>
            ) : null}
            {pendingAckCount > 0 ? (
              <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                {pendingAckCount} {t('pending_ack')}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {isLoading ? <NotificationsSkeleton /> : null}

      {!isLoading && isError ? (
        <div className="p-3">
          <QueryErrorState className="shadow-none" onRetry={onRetry} />
        </div>
      ) : null}

      {!isLoading && !isError && latestNotifications.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="font-semibold text-text-primary">{t('no_notifications')}</p>
          <p className="mt-2 text-sm text-text-muted">{t('no_notifications_desc')}</p>
        </div>
      ) : null}

      {!isLoading && !isError && latestNotifications.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {latestNotifications.map((notification) => (
            <NotificationListItem
              key={notification.id}
              compact
              notification={notification}
              onNavigate={onClose}
            />
          ))}
        </div>
      ) : null}

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push('/notifications');
          }}
          className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-background"
        >
          <span>{t('view_all')}</span>
          <div className="flex items-center gap-2">
            {pendingAckCount > 0 ? <span className="h-2.5 w-2.5 rounded-full bg-danger" /> : null}
            <ChevronRight size={16} />
          </div>
        </button>
      </div>
    </div>
  );
}
