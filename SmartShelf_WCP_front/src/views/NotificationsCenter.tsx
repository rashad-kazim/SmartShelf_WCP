'use client';

import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGetNotificationsQuery } from '@/api/api';
import QueryErrorState from '@/components/feedback/QueryErrorState';
import NotificationListItem from '@/components/notifications/NotificationListItem';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function NotificationsPageSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-surface-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/3 rounded-full bg-surface-muted" />
              <div className="h-3 w-full rounded-full bg-surface-muted" />
              <div className="h-3 w-2/3 rounded-full bg-surface-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsCenter() {
  const { t } = useTranslation();
  const {
    data: notifications = [],
    isLoading,
    isError,
    refetch,
  } = useGetNotificationsQuery();

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const pendingAckCount = notifications.filter(
    (notification) => notification.requiresAck && !notification.acknowledgedAt,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
              <Bell size={22} />
            </div>
            <h1 className="text-2xl font-bold">{t('all_notifications')}</h1>
          </div>
          <p className="max-w-2xl text-sm text-text-muted">{t('notifications_desc')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 ? (
            <Badge variant="default" className="w-fit">
              {unreadCount} {t('unread')}
            </Badge>
          ) : null}
          {pendingAckCount > 0 ? (
            <Badge variant="destructive" className="w-fit">
              {pendingAckCount} {t('pending_ack')}
            </Badge>
          ) : null}
        </div>
      </div>

      {isLoading ? <NotificationsPageSkeleton /> : null}

      {!isLoading && isError ? <QueryErrorState onRetry={() => void refetch()} /> : null}

      {!isLoading && !isError && notifications.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-12 text-center">
            <p className="text-lg font-semibold text-text-primary">{t('no_notifications')}</p>
            <p className="mt-2 text-sm text-text-muted">{t('no_notifications_desc')}</p>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isError && notifications.length > 0 ? (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>{t('notifications')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {notifications.map((notification) => (
              <NotificationListItem key={notification.id} notification={notification} />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
