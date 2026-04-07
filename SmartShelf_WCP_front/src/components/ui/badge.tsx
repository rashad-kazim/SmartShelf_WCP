import * as React from 'react';
import { cn } from '@/utils/cn';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'destructive' | 'info';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-brand-primary/10 text-brand-primary',
  secondary: 'bg-background text-text-primary',
  success: 'bg-success/10 text-success',
  destructive: 'bg-danger/10 text-danger',
  info: 'bg-brand-secondary/10 text-brand-secondary',
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
