import { useState } from 'react';
import { useProducts, useUpdateProduct } from '@/hooks/useProducts';
import { useAllReservations } from '@/hooks/useReservations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Package, Truck, Mail } from 'lucide-react';
import { toast } from 'sonner';

export function AdminOrders() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: allReservations, isLoading: reservationsLoading } = useAllReservations();
  const updateProduct = useUpdateProduct();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const isLoading = productsLoading || reservationsLoading;

  // Group reservations by product
  const reservationsByProduct = allReservations?.reduce((acc, reservation) => {
    if (!acc[reservation.product_id]) {
      acc[reservation.product_id] = [];
    }
    acc[reservation.product_id].push(reservation);
    return acc;
  }, {} as Record<string, typeof allReservations>);

  // Filter products that have reservations and are ready to order
  const readyToOrder = products?.filter(
    (p) => p.status === 'open' && p.current_quantity >= p.target_quantity
  );

  const orderedProducts = products?.filter((p) => p.status === 'ordered');
  const arrivedProducts = products?.filter((p) => p.status === 'arrived');

  const updateProductStatus = async (productId: string, newStatus: 'ordered' | 'arrived') => {
    setUpdatingStatus(productId);
    try {
      await updateProduct.mutateAsync({ id: productId, status: newStatus });
      
      const statusLabel = newStatus === 'ordered' ? 'bestilt' : 'ankommet';
      toast.success(
        `Produktet er markeret som ${statusLabel}`,
        { 
          description: 'Notifikationer sendes automatisk til alle brugere med reservationer.',
          icon: <Mail className="h-4 w-4" />
        }
      );
    } catch (error: any) {
      console.error('Error updating product status:', error);
      toast.error('Kunne ikke opdatere status', { description: error.message });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      open: { className: 'bg-primary/20 text-primary', label: 'Åben' },
      ordered: { className: 'bg-accent/20 text-accent-foreground', label: 'Bestilt' },
      arrived: { className: 'bg-green-100 text-green-800', label: 'Ankommet' },
      completed: { className: 'bg-muted text-muted-foreground', label: 'Afsluttet' },
    };
    const { className, label } = config[status] || config.open;
    return <Badge className={className}>{label}</Badge>;
  };

  if (isLoading) {
    return <div className="text-center py-8">Indlæser ordrer...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Info banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <p className="text-sm">
              <strong>Automatiske notifikationer:</strong> Når du ændrer et produkts status, sendes der automatisk email til alle brugere med reservationer.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ready to Order */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          Klar til bestilling ({readyToOrder?.length || 0})
        </h2>
        {readyToOrder && readyToOrder.length > 0 ? (
          <div className="grid gap-4">
            {readyToOrder.map((product) => (
              <Card key={product.id} className="border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{product.title}</h3>
                        {getStatusBadge(product.status)}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Progress
                          value={(product.current_quantity / product.target_quantity) * 100}
                          className="h-2 flex-1"
                        />
                        <span className="text-sm font-medium">
                          {product.current_quantity} / {product.target_quantity}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {reservationsByProduct?.[product.id]?.length || 0} reservationer
                      </p>
                    </div>
                    <Button
                      onClick={() => updateProductStatus(product.id, 'ordered')}
                      disabled={updatingStatus === product.id}
                      className="flex items-center gap-2"
                    >
                      <Truck className="h-4 w-4" />
                      {updatingStatus === product.id ? 'Opdaterer...' : 'Marker som bestilt'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Ingen produkter er klar til bestilling endnu.
            </CardContent>
          </Card>
        )}
      </section>

      {/* Ordered Products */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-accent" />
          Bestilte produkter ({orderedProducts?.length || 0})
        </h2>
        {orderedProducts && orderedProducts.length > 0 ? (
          <div className="grid gap-4">
            {orderedProducts.map((product) => (
              <Card key={product.id} className="border-accent/30 bg-accent/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{product.title}</h3>
                        {getStatusBadge(product.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {product.current_quantity} {product.unit_name} bestilt
                      </p>
                    </div>
                    <Button
                      onClick={() => updateProductStatus(product.id, 'arrived')}
                      disabled={updatingStatus === product.id}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      {updatingStatus === product.id ? 'Opdaterer...' : 'Marker som ankommet'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Ingen produkter afventer levering.
            </CardContent>
          </Card>
        )}
      </section>

      {/* Arrived Products */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-green-600" />
          Ankomne produkter ({arrivedProducts?.length || 0})
        </h2>
        {arrivedProducts && arrivedProducts.length > 0 ? (
          <div className="grid gap-4">
            {arrivedProducts.map((product) => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{product.title}</h3>
                        {getStatusBadge(product.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Klar til afhentning • {reservationsByProduct?.[product.id]?.length || 0} reservationer
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Ingen produkter er ankommet endnu.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
