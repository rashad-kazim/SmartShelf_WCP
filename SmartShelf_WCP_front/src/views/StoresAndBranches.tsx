 'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  PlusCircle, 
  Edit3, 
  Trash2, 
  FileText,
  ChevronRight
} from 'lucide-react';
import { cn } from '../utils/cn';

export default function StoresAndBranches() {
  const router = useRouter();
  const { t } = useTranslation();

  const cards = [
    {
      id: 'create',
      title: t('create_new_store'),
      description: t('create_store_desc'),
      icon: PlusCircle,
      color: 'text-brand-primary',
      bg: 'bg-brand-primary/10',
      path: '/installation'
    },
    {
      id: 'edit',
      title: t('edit_store'),
      description: t('edit_store_desc'),
      icon: Edit3,
      color: 'text-warning',
      bg: 'bg-warning/10',
      path: '/stores/edit'
    },
    {
      id: 'delete',
      title: t('delete_store'),
      description: t('delete_store_desc'),
      icon: Trash2,
      color: 'text-danger',
      bg: 'bg-danger/10',
      path: '/stores/delete'
    },
    {
      id: 'logs',
      title: t('view_logs'),
      description: t('view_logs_desc'),
      icon: FileText,
      color: 'text-success',
      bg: 'bg-success/10',
      path: '/stores/logs'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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
            <p className="text-text-muted text-sm leading-relaxed mb-8 flex-1">
              {card.description}
            </p>
            <div className="flex items-center gap-2 text-brand-primary font-semibold text-sm">
              <span className="group-hover:underline">{t('continue')}</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
