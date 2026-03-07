import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/supabase-types';
import { MapPin, Package } from 'lucide-react';
import { OrganicBadge } from '@/components/OrganicBadge';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const progress = (product.current_quantity / product.target_quantity) * 100;
  const isComplete = product.current_quantity >= product.target_quantity;

  const isTargetReached = product.status === 'open' && isComplete;

  const getStatusLabel = (status: string) => {
    if (isTargetReached) return 'Mål nået';
    switch (status) {
      case 'open':
        return 'Åben';
      case 'ordered':
        return 'Bestilt hjem';
      case 'arrived':
        return 'Klar til afhentning';
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    if (isTargetReached) return 'bg-success/20 text-success';
    switch (status) {
      case 'open':
        return 'bg-primary/10 text-primary';
      case 'ordered':
        return 'bg-warning/20 text-warning-foreground';
      case 'arrived':
        return 'bg-success/20 text-success';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Link to={`/produkt/${product.id}`}>
      <Card className="card-hover overflow-hidden group h-full">
        {/* Image */}
        <div className="aspect-square relative overflow-hidden bg-white">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
          {/* Status Badge */}
          <Badge className={`absolute top-3 right-3 ${getStatusClass(product.status)}`}>
            {getStatusLabel(product.status)}
          </Badge>
          {/* Organic Badge */}
          {product.is_organic && (
            <OrganicBadge className="absolute top-3 left-3" size="sm" />
          )}
        </div>

        <CardContent className="p-4">
          {/* Category */}
          {product.category && (
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {product.category.name}
            </p>
          )}

          {/* Title */}
          <h3 className="font-serif font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>

          {/* Origin */}
          {product.origin_country && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
              <MapPin className="w-3 h-3" />
              <span>{product.origin_country}</span>
            </div>
          )}

          {/* Price */}
          <div className="mb-1">
            {product.comparison_price && (
              <p className="text-sm text-muted-foreground line-through">
                {product.comparison_price.toFixed(2)} kr/{product.unit_name} *
              </p>
            )}
            {product.minimum_purchase > 1 ? (
              <>
                <p className="text-xl font-semibold text-foreground">
                  {(product.price_per_unit * product.minimum_purchase).toFixed(2)} kr
                  <span className="text-sm font-normal text-muted-foreground">
                    /{product.minimum_purchase} {product.unit_name}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  ({product.price_per_unit.toFixed(2)} kr/{product.unit_name})
                </p>
              </>
            ) : (
              <p className="text-xl font-semibold text-foreground">
                {product.price_per_unit.toFixed(2)} kr
                <span className="text-sm font-normal text-muted-foreground">/{product.unit_name}</span>
              </p>
            )}
          </div>

          {/* Comparison note */}
          {product.comparison_price && (
            <p className="text-xs text-success mb-3">
              * Spar {Math.round((1 - product.price_per_unit / product.comparison_price) * 100)}%
              {product.comparison_source
                ? ` sammenlignet med tilsvarende produkt fra ${product.comparison_source}`
                : ' sammenlignet med normalprisen'}
            </p>
          )}
          {!product.comparison_price && <div className="mb-4" />}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tilmeldt</span>
              <span className="font-medium">
                {product.current_quantity} af {product.target_quantity} {product.unit_name}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={isComplete ? 'progress-fill-complete' : 'progress-fill'}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
