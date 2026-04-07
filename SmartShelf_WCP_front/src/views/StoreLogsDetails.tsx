'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import { Activity, Bluetooth, Clock3, Router, Wifi } from 'lucide-react';
import { useGetLayer2DetailsQuery } from '@/api/api';
import QueryErrorState from '@/components/feedback/QueryErrorState';
import PanelLoader from '@/components/loading/PanelLoader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
};

export default function StoreLogsDetails() {
  const { t } = useTranslation();
  const params = useParams<{ storeId: string | string[] }>();
  const storeId = Array.isArray(params?.storeId) ? params.storeId[0] : params?.storeId ?? '';
  const { data: layer2, isLoading, error, refetch } = useGetLayer2DetailsQuery(storeId, {
    skip: !storeId,
  });

  if (isLoading) {
    return <PanelLoader minHeightClassName="min-h-[64vh]" />;
  }

  if (error || !layer2) {
    return (
      <div className="p-4 sm:p-8">
        <QueryErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{t('layer2_details')}</CardTitle>
              <p className="mt-2 text-sm text-text-muted">{t('layer2_details_desc')}</p>
            </div>
            <Badge variant={layer2.status === 'online' ? 'success' : 'destructive'} className="w-fit px-3 py-1">
              {layer2.status === 'online' ? t('online') : t('offline')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="mb-3 flex items-center gap-3 text-brand-primary">
              <Router size={20} />
              <span className="text-sm font-semibold text-text-muted">{t('layer2_id')}</span>
            </div>
            <p className="text-lg font-bold text-text-primary">{layer2.layer2_id}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="mb-3 flex items-center gap-3 text-brand-primary">
              <Bluetooth size={20} />
              <span className="text-sm font-semibold text-text-muted">{t('esp32_count')}</span>
            </div>
            <p className="text-lg font-bold text-text-primary">{layer2.esp32_count}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="mb-3 flex items-center gap-3 text-brand-primary">
              <Wifi size={20} />
              <span className="text-sm font-semibold text-text-muted">{t('layer2_version')}</span>
            </div>
            <p className="text-lg font-bold text-text-primary">{layer2.layer2_version}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="mb-3 flex items-center gap-3 text-brand-primary">
              <Router size={20} />
              <span className="text-sm font-semibold text-text-muted">{t('layer1_version')}</span>
            </div>
            <p className="text-lg font-bold text-text-primary">{layer2.layer1_version}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="mb-3 flex items-center gap-3 text-brand-primary">
              <Clock3 size={20} />
              <span className="text-sm font-semibold text-text-muted">{t('last_heartbeat')}</span>
            </div>
            <p className="text-lg font-bold text-text-primary">{formatDateTime(layer2.last_heartbeat_at)}</p>
          </div>
        </CardContent>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-brand-primary" />
              <span className="text-sm font-semibold text-text-muted">{t('layer2_status')}</span>
            </div>
            <p className="mt-3 text-base font-bold text-text-primary">
              {layer2.status === 'online' ? t('online') : t('offline')}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="flex items-center gap-3">
              <Clock3 size={18} className="text-brand-primary" />
              <span className="text-sm font-semibold text-text-muted">{t('last_sync')}</span>
            </div>
            <p className="mt-3 text-base font-bold text-text-primary">{formatDateTime(layer2.last_sync_at)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-brand-primary" />
              <span className="text-sm font-semibold text-text-muted">{t('sync_status')}</span>
            </div>
            <p className="mt-3 text-base font-bold text-text-primary">
              {layer2.sync_status} / {layer2.pending_sync_data}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
