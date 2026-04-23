import { cn } from '@/lib/utils';

interface OrganicBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Det danske økologi-mærke ("rødt Ø") gengivet som inline SVG.
 * Erstatter en 25 KiB JPG → 0 ekstra HTTP-request og skarpt på alle DPI.
 */
export function OrganicBadge({ className, size = 'md' }: OrganicBadgeProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <span
      role="img"
      aria-label="Økologisk"
      title="Økologisk"
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-[hsl(0_72%_42%)] text-white font-serif font-bold shadow-sm',
        sizeClasses[size],
        className,
      )}
    >
      <span
        className={cn(
          'leading-none',
          size === 'sm' && 'text-[0.85rem]',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-2xl',
        )}
      >
        Ø
      </span>
    </span>
  );
}
