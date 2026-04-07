'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import RingLoader from './RingLoader';

interface PanelLoaderProps {
  className?: string;
  labelKey?: string;
  minHeightClassName?: string;
}

export default function PanelLoader({
  className,
  labelKey = 'loading',
  minHeightClassName = 'min-h-[55vh]',
}: PanelLoaderProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-[2rem] border border-white/30 bg-white/12 px-6 py-10 backdrop-blur-[34px] shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950/12',
        minHeightClassName,
        className,
      )}
    >
      <span className="absolute inset-x-0 top-0 h-24 bg-white/18 blur-2xl dark:bg-white/5" />
      <span className="absolute inset-x-10 bottom-0 h-20 rounded-full bg-black/5 blur-3xl dark:bg-black/10" />
      <RingLoader size="md" label={t(labelKey)} />
    </div>
  );
}
