import { cn } from '@/lib/utils';

interface OrganicBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function OrganicBadge({ className, size = 'md' }: OrganicBadgeProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-red-600 text-white font-bold',
        sizeClasses[size],
        className
      )}
      title="Økologisk"
    >
      <span className={cn(
        'font-serif',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-lg'
      )}>
        Ø
      </span>
    </div>
  );
}
