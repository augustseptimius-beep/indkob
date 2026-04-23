import { cn } from '@/lib/utils';
import oMaerket from '@/assets/o-maerket.png';

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
    <img
      src={oMaerket}
      alt="Statskontrolleret økologisk"
      title="Statskontrolleret økologisk"
      loading="lazy"
      decoding="async"
      className={cn('object-contain shrink-0', sizeClasses[size], className)}
    />
  );
}
