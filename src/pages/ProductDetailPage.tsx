import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProduct } from '@/hooks/useProducts';
import { useReservationCount } from '@/hooks/useReservationCount';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, MapPin, Package, Minus, Plus, Users, AlertTriangle, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { OrganicBadge } from '@/components/OrganicBadge';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id!);
  const { data: reserverCount } = useReservationCount(id!);
  const { user } = useAuth();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    toast.success(`${product.title} tilføjet til kurven`);
    setQuantity(1);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container-wide py-12">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid md:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container-wide py-12 text-center">
          <p>Produkt ikke fundet</p>
          <Button asChild className="mt-4">
            <Link to="/produkter">Tilbage til produkter</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const progress = (product.current_quantity / product.target_quantity) * 100;
  const remaining = product.target_quantity - product.current_quantity;
  const isComplete = remaining <= 0;
  const isAlmostComplete = !isComplete && remaining <= product.notify_threshold * product.minimum_purchase;

  return (
    <Layout>
      <div className="container-wide py-12">
        <Link to="/produkter" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Tilbage til produkter
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Image */}
          <div className="aspect-square rounded-2xl overflow-hidden bg-white">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-24 h-24 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            {product.category && (
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
                {product.category.name}
              </p>
            )}
            
            <div className="flex items-center gap-3 mb-4">
              <h1 className="font-serif text-3xl md:text-4xl font-bold">{product.title}</h1>
              {product.is_organic && <OrganicBadge size="lg" />}
            </div>
            
            {product.origin_country && (
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="w-4 h-4" />
                <span>{product.origin_country}</span>
              </div>
            )}

            <div className="mb-2">
              {product.comparison_price && (
                <p className="text-lg text-muted-foreground line-through">
                  {product.comparison_price.toFixed(2)} kr/{product.unit_name} *
                </p>
              )}
              {product.minimum_purchase > 1 ? (
                <>
                  <p className="text-3xl font-bold">
                    {(product.price_per_unit * product.minimum_purchase).toFixed(2)} kr
                    <span className="text-lg font-normal text-muted-foreground">
                      /{product.minimum_purchase} {product.unit_name}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ({product.price_per_unit.toFixed(2)} kr/{product.unit_name})
                  </p>
                </>
              ) : (
                <p className="text-3xl font-bold">
                  {product.price_per_unit.toFixed(2)} kr
                  <span className="text-lg font-normal text-muted-foreground">/{product.unit_name}</span>
                </p>
              )}
            </div>

            {/* Comparison note */}
            {product.comparison_price && (
              <p className="text-sm text-success mb-4">
                * Spar {Math.round((1 - product.price_per_unit / product.comparison_price) * 100)}%
                {product.comparison_source
                  ? ` sammenlignet med tilsvarende produkt fra ${product.comparison_source}`
                  : ' sammenlignet med normalprisen'}
              </p>
            )}

            {product.description && (
              <p className="text-muted-foreground mb-6">{product.description}</p>
            )}

            {product.supplier_url && (
              <p className="text-sm text-muted-foreground mb-6">
                Læs mere om produktet hos leverandøren:{' '}
                <a href={product.supplier_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  {product.supplier_name || 'Se her'} <ExternalLink className="w-3 h-3 inline" />
                </a>
              </p>
            )}

            {/* Progress */}
            <div className="bg-card rounded-xl p-6 mb-6 border">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Tilmelding</span>
                <span className="font-semibold">{product.current_quantity} / {product.target_quantity} {product.unit_name}</span>
              </div>
              <div className="progress-bar h-3 mb-2">
                <div className={isComplete ? 'progress-fill-complete' : 'progress-fill'} style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              
              {/* Social proof */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {isComplete ? 'Målet er nået!' : `Mangler ${remaining} ${product.unit_name}`}
                </p>
                {reserverCount !== undefined && reserverCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{reserverCount} {reserverCount === 1 ? 'medlem har' : 'medlemmer har'} reserveret</span>
                  </div>
                )}
              </div>

              {/* Urgency message */}
              {isAlmostComplete && (
                <div className="mt-3 flex items-center gap-2 text-sm font-medium text-warning-foreground bg-warning/10 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Kun {remaining} {product.unit_name} fra mål — snart klar til bestilling!
                  </span>
                </div>
              )}
            </div>

            {/* Add to Cart */}
            {product.status === 'open' && !isComplete && (
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-lg">
                  <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(product.minimum_purchase, quantity - 1))}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(product.minimum_purchase, parseInt(e.target.value) || 1))} className="w-16 text-center border-0" min={product.minimum_purchase} />
                  <Button variant="ghost" size="icon" onClick={() => setQuantity(quantity + 1)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Button onClick={handleAddToCart} size="lg" className="flex-1 gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Læg i kurv
                </Button>
              </div>
            )}

            {product.status === 'open' && isComplete && (
              <div className="bg-success/10 border border-success/30 rounded-xl p-4 text-center">
                <p className="font-medium text-success">Målet er nået! 🎉</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Afventer bestilling hos leverandør. Produktet åbner igen for nye tilmeldinger snart.
                </p>
              </div>
            )}


            {product.status === 'arrived' && (
              <Badge className="text-base px-4 py-2">Klar til afhentning</Badge>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
