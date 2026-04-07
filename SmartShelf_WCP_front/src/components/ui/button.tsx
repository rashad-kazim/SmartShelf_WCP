import * as React from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'ghost'
  | 'outline'
  | 'surface';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90',
  secondary:
    'border border-border bg-gray-100 text-gray-800 hover:bg-gray-200',
  destructive: 'bg-danger text-white hover:bg-danger/90',
  ghost: 'bg-transparent text-text-muted hover:bg-background hover:text-text-primary shadow-none',
  outline: 'border border-border bg-transparent text-text-primary hover:bg-background',
  surface: 'border border-border bg-surface text-text-primary hover:bg-background',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-12 px-6 py-3',
  sm: 'h-10 px-4 py-2 text-sm',
  lg: 'h-14 px-8 py-4 text-base',
  icon: 'h-10 w-10',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      type = 'button',
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = 'Button';

export { Button };
