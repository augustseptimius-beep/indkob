import { cn } from '@/lib/utils';
import organicLabel from '@/assets/organic-label.jpg';

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
    <img
      src={organicLabel}
      alt="Økologisk"
      title="Økologisk"
      className={cn(sizeClasses[size], className)}
    />
  );
}
