 'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { Store, FileText, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

export default function StoreDetails() {
  const { t } = useTranslation();
  const params = useParams<{ storeId: string | string[] }>();
  const storeId = Array.isArray(params?.storeId) ? params.storeId[0] : params?.storeId;
  const router = useRouter();

  const cards = [
    {
      id: 'summary',
      title: t('store_gateway_summary'),
      description: t('store_gateway_summary_desc'),
      icon: Store,
      color: 'text-brand-primary',
      bg: 'bg-brand-primary/10',
      path: `/stores/${storeId}/summary`
    },
    {
      id: 'logs',
      title: t('technical_device_logs'),
      description: t('technical_device_logs_desc'),
      icon: FileText,
      color: 'text-success',
      bg: 'bg-success/10',
      path: `/stores/${storeId}/logs/device-logs`
    }
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => router.push(card.path)}
            className="group bg-surface p-8 rounded-3xl border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col h-full cursor-pointer"
          >
            <div className={cn("p-4 rounded-2xl w-fit mb-6 transition-transform group-hover:scale-110", card.bg)}>
              <card.icon className={card.color} size={32} />
            </div>
            <h3 className="text-xl font-bold mb-3">{card.title}</h3>
            <p className="text-text-secondary text-base mb-4">{card.description}</p>
            <div className="flex items-center gap-2 text-brand-primary font-semibold text-sm mt-auto">
              <span className="group-hover:underline">{t('continue')}</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
