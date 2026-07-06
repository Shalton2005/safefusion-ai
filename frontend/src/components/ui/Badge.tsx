import { cn } from '@/lib/cn';
import type { Variant, Size } from '@/types';

interface BadgeProps {
  variant?: Variant | 'default';
  size?: Extract<Size, 'sm' | 'md'>;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default:
    'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
  primary:
    'bg-primary-600/15 text-primary-400 border-primary-600/30',
  secondary:
    'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
  success:
    'bg-safe-500/15 text-safe-600 dark:text-safe-500 border-safe-500/30',
  warning:
    'bg-caution-500/15 text-caution-600 dark:text-caution-500 border-caution-500/30',
  danger:
    'bg-danger-500/15 text-danger-600 dark:text-danger-500 border-danger-500/30',
  ghost:
    'bg-transparent text-[var(--color-text-muted)] border-transparent',
  outline:
    'bg-transparent text-[var(--color-text-primary)] border-[var(--color-border)]',
};

const sizeClasses: Record<'sm' | 'md', string> = {
  sm: 'text-2xs px-1.5 py-0.5 gap-1',
  md: 'text-xs  px-2   py-0.5 gap-1.5',
};

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            variant === 'success' ? 'bg-safe-500'    :
            variant === 'warning' ? 'bg-caution-500' :
            variant === 'danger'  ? 'bg-danger-500'  :
            variant === 'primary' ? 'bg-primary-500' :
            'bg-current',
          )}
        />
      )}
      {children}
    </span>
  );
}
