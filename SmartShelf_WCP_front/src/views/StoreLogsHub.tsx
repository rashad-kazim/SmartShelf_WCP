'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRight, FileText, Router } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function StoreLogsHub() {
  const { t } = useTranslation();
  const params = useParams<{ storeId: string | string[] }>();
  const storeId = Array.isArray(params?.storeId) ? params.storeId[0] : params?.storeId;
  const router = useRouter();

  const cards = [
    {
      id: 'layer2',
      title: t('layer2_details'),
      description: t('layer2_logs_hub_desc'),
      icon: Router,
      color: 'text-brand-primary',
      bg: 'bg-brand-primary/10',
      path: `/stores/${storeId}/logs/layer2`,
    },
    {
      id: 'device-logs',
      title: t('device_logs'),
      description: t('device_logs_hub_desc'),
      icon: FileText,
      color: 'text-success',
      bg: 'bg-success/10',
      path: `/stores/${storeId}/logs/device-logs`,
    },
  ];

  return (
    <div className="space-y-8 p-4 sm:p-8">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-text-primary">{t('view_logs')}</h1>
        <p className="mt-2 text-sm text-text-muted">{t('store_logs_hub_desc')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => router.push(card.path)}
            className="group flex h-full cursor-pointer flex-col rounded-3xl border border-border bg-surface p-8 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className={cn('mb-6 w-fit rounded-2xl p-4 transition-transform group-hover:scale-110', card.bg)}>
              <card.icon className={card.color} size={32} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-text-primary">{card.title}</h3>
            <p className="mb-4 text-base text-text-secondary">{card.description}</p>
            <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-brand-primary">
              <span className="group-hover:underline">{t('continue')}</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
