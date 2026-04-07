import * as React from 'react';
import { cn } from '@/utils/cn';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary',
        'outline-none transition-colors focus:border-brand-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

Select.displayName = 'Select';

export { Select };
