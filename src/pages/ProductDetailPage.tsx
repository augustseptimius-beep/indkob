import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useProduct } from '@/hooks/useProducts';
import { useCreateReservation } from '@/hooks/useReservations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, MapPin, Package, Minus, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { OrganicBadge } from '@/components/OrganicBadge';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id!);
  const { user } = useAuth();
  const createReservation = useCreateReservation();
  const [quantity, setQuantity] = useState(1);

  const handleReserve = async () => {
    if (!user) {
      toast.error('Du skal være logget ind for at reservere');
      return;
    }
    try {
      await createReservation.mutateAsync({ productId: id!, quantity });
      toast.success(`Du har reserveret ${quantity} ${product?.unit_name}!`);
      setQuantity(1);
    } catch (error: any) {
      toast.error(error.message || 'Kunne ikke reservere');
    }
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

  return (
    <Layout>
      <div className="container-wide py-12">
        <Link to="/produkter" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Tilbage til produkter
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Image */}
          <div className="aspect-square rounded-2xl overflow-hidden bg-secondary">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
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

            <p className="text-3xl font-bold mb-2">
              {product.price_per_unit.toFixed(2)} kr
              <span className="text-lg font-normal text-muted-foreground">/{product.unit_name}</span>
            </p>

            {product.description && (
              <p className="text-muted-foreground mb-6">{product.description}</p>
            )}

            {product.supplier_url && product.supplier_name && (
              <a href={product.supplier_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
                {product.supplier_name} <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {product.supplier_url && !product.supplier_name && (
              <a href={product.supplier_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
                Se hos leverandør <ExternalLink className="w-4 h-4" />
              </a>
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
              <p className="text-sm text-muted-foreground">
                {isComplete ? 'Målet er nået!' : `Mangler ${remaining} ${product.unit_name}`}
              </p>
            </div>

            {/* Reservation */}
            {product.status === 'open' && !isComplete && user && (
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
                <Button onClick={handleReserve} disabled={createReservation.isPending} size="lg" className="flex-1">
                  Reserver {quantity} {product.unit_name}
                </Button>
              </div>
            )}

            {!user && product.status === 'open' && (
              <Button asChild size="lg" className="w-full">
                <Link to="/auth">Log ind for at reservere</Link>
              </Button>
            )}

            {product.status !== 'open' && (
              <Badge className="text-base px-4 py-2">{product.status === 'ordered' ? 'Bestilt hjem' : product.status === 'arrived' ? 'Klar til afhentning' : 'Afsluttet'}</Badge>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
