import { cn } from '@/utils/cn';

interface RingLoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: {
    wrapper: 'h-14 w-14',
    outer: 'h-14 w-14 border-[4px]',
    inner: 'h-10 w-10 border-[3px]',
    text: 'text-[10px]',
  },
  md: {
    wrapper: 'h-20 w-20',
    outer: 'h-20 w-20 border-[4px]',
    inner: 'h-14 w-14 border-[4px]',
    text: 'text-xs',
  },
  lg: {
    wrapper: 'h-28 w-28',
    outer: 'h-28 w-28 border-[5px]',
    inner: 'h-20 w-20 border-[4px]',
    text: 'text-lg',
  },
} as const;

export default function RingLoader({
  label,
  size = 'md',
  className,
}: RingLoaderProps) {
  const config = sizeMap[size];

  return (
    <div className={cn('relative inline-flex items-center justify-center', config.wrapper, className)}>
      <span className="absolute inset-0 rounded-full border border-white/35 bg-white/18 dark:bg-white/6" />
      <span
        className={cn(
          'absolute rounded-full border-transparent border-t-brand-secondary border-r-brand-primary animate-loader-spin shadow-[0_0_18px_rgba(0,207,255,0.16)]',
          config.outer,
        )}
      />
      <span
        className={cn(
          'absolute rounded-full border-transparent border-b-brand-primary border-l-[#3fffd7] animate-loader-spin-reverse shadow-[0_0_18px_rgba(63,255,215,0.14)]',
          config.inner,
        )}
      />
      {label ? (
        <span suppressHydrationWarning className={cn('relative z-10 font-bold tracking-wide text-text-primary', config.text)}>
          {label}
        </span>
      ) : null}
    </div>
  );
}
