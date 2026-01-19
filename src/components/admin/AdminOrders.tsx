import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useAllReservations } from '@/hooks/useReservations';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mail, Check, Package, Truck } from 'lucide-react';
import { toast } from 'sonner';

export function AdminOrders() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: allReservations, isLoading: reservationsLoading } = useAllReservations();
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);

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

  const sendNotification = async (productId: string, type: 'ordered' | 'arrived') => {
    setSendingNotification(productId);
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: { productId, notificationType: type },
      });

      if (error) throw error;

      toast.success(
        `Email sendt til ${data.emailsSent} brugere!`,
        { description: type === 'ordered' ? 'Produktet er markeret som bestilt' : 'Produktet er markeret som ankommet' }
      );
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error('Kunne ikke sende notifikation', { description: error.message });
    } finally {
      setSendingNotification(null);
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
                      onClick={() => sendNotification(product.id, 'ordered')}
                      disabled={sendingNotification === product.id}
                      className="flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      {sendingNotification === product.id ? 'Sender...' : 'Marker som bestilt'}
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
                      onClick={() => sendNotification(product.id, 'arrived')}
                      disabled={sendingNotification === product.id}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      {sendingNotification === product.id ? 'Sender...' : 'Marker som ankommet'}
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
