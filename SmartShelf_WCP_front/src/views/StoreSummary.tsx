'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import { Clock, HardDrive, Server, Store, Wifi } from 'lucide-react';
import { useGetStoreSummaryQuery } from '@/api/api';
import QueryErrorState from '@/components/feedback/QueryErrorState';
import PanelLoader from '@/components/loading/PanelLoader';
import { cn } from '@/utils/cn';
import { translateLocation } from '@/i18n/ui';

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
};

const formatUptime = (heartbeat: string | null | undefined) => {
  if (!heartbeat) {
    return '-';
  }

  const diffMs = Date.now() - new Date(heartbeat).getTime();
  const totalHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days} d ${hours} h`;
};

const StoreInfoCard = ({
  infoItems,
  title,
}: {
  infoItems: Array<{ label: string; value: string }>;
  title: string;
}) => (
  <div className="bg-surface p-6 rounded-2xl border border-border h-full">
    <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
      <Store size={20} className="text-brand-primary" />
      {title}
    </h3>
    <ul className="space-y-4">
      {infoItems.map((item) => (
        <li key={item.label} className="flex flex-col sm:flex-row sm:justify-between sm:items-start text-sm">
          <span className="text-muted-foreground">{item.label}</span>
          <span className="sm:text-right font-medium text-text-primary">{item.value}</span>
        </li>
      ))}
    </ul>
  </div>
);

const GatewayStatusCard = ({
  title,
  isOnline,
  techSpecs,
}: {
  title: string;
  isOnline: boolean;
  techSpecs: Array<{ label: string; value: string; icon: typeof HardDrive }>;
}) => (
  <div className="bg-surface p-6 rounded-2xl border border-border h-full">
    <div className="flex justify-between items-start mb-6">
      <h3 className="text-lg font-bold">{title}</h3>
      <div
        className={cn(
          'px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2',
          isOnline ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
        )}
      >
        <span className={cn('h-2 w-2 rounded-full', isOnline ? 'bg-success' : 'bg-destructive')} />
        {isOnline ? 'ONLINE' : 'OFFLINE'}
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-8">
      {techSpecs.map((spec) => (
        <div key={spec.label}>
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <spec.icon size={14} />
            {spec.label}
          </div>
          <div className="text-md font-bold text-text-primary ml-6">{spec.value}</div>
        </div>
      ))}
    </div>
  </div>
);

export default function StoreSummary() {
  const { t } = useTranslation();
  const params = useParams<{ storeId: string | string[] }>();
  const storeId = Array.isArray(params?.storeId) ? params.storeId[0] : params?.storeId ?? '';
  const { data, isLoading, error, refetch } = useGetStoreSummaryQuery(storeId, {
    skip: !storeId,
  });

  if (isLoading) {
    return <PanelLoader minHeightClassName="min-h-[64vh]" />;
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-8">
        <QueryErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  const store = data.store;
  const layer2 = data.layer_2;
  const infoItems = [
    { label: t('store_name'), value: store.name },
    { label: t('location'), value: translateLocation(t, store.city, store.country) },
    { label: t('store_address'), value: store.address ?? '-' },
    { label: t('owner'), value: `${store.owner_name ?? ''} ${store.owner_surname ?? ''}`.trim() || '-' },
    {
      label: t('working_hours'),
      value:
        store.opening_hour && store.closing_hour
          ? `${store.opening_hour} - ${store.closing_hour}`
          : t('all_day_open'),
    },
  ];
  const techSpecs = [
    { label: t('layer2_version'), value: layer2.layer2_version || '-', icon: HardDrive },
    { label: t('server_ip'), value: layer2.gateway_ip || '-', icon: Server },
    { label: t('gateway_port'), value: String(layer2.gateway_port || '-'), icon: Wifi },
    { label: t('last_heartbeat'), value: formatDateTime(layer2.last_heartbeat_at), icon: Clock },
    { label: t('uptime'), value: formatUptime(layer2.last_heartbeat_at), icon: Server },
  ];

  return (
    <div className="p-4 sm:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <StoreInfoCard infoItems={infoItems} title={t('store_information')} />
        </div>
        <div className="lg:col-span-2">
          <GatewayStatusCard
            title={t('gateway_status_connectivity')}
            isOnline={layer2.status === 'online'}
            techSpecs={techSpecs}
          />
        </div>
      </div>
    </div>
  );
}
