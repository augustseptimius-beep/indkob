import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProducts, useUpdateProduct } from '@/hooks/useProducts';
import { useAllReservations, useUpdateReservation } from '@/hooks/useReservations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Package, Truck, Mail, CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function AdminOrders() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: allReservations, isLoading: reservationsLoading } = useAllReservations();
  const updateProduct = useUpdateProduct();
  const updateReservation = useUpdateReservation();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // Fetch all profiles for admin view
  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');
      if (error) throw error;
      return data;
    },
  });

  const profilesMap = useMemo(() => {
    const map: Record<string, { full_name: string | null; email: string | null }> = {};
    profiles?.forEach(p => { map[p.user_id] = p; });
    return map;
  }, [profiles]);

  const isLoading = productsLoading || reservationsLoading;

  // Group reservations by product
  const reservationsByProduct = allReservations?.reduce((acc, reservation) => {
    if (!acc[reservation.product_id]) {
      acc[reservation.product_id] = [];
    }
    acc[reservation.product_id].push(reservation);
    return acc;
  }, {} as Record<string, typeof allReservations>);

  const readyToOrder = products?.filter(
    (p) => p.status === 'open' && p.current_quantity >= p.target_quantity
  );

  const orderedProducts = products?.filter((p) => p.status === 'ordered');
  const arrivedProducts = products?.filter((p) => p.status === 'arrived');

  const unpaidReservations = allReservations?.filter(
    (r) => (r.status === 'ordered' || r.status === 'ready') && !r.paid
  ) || [];

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

  const markReservationAsPaid = async (reservationId: string) => {
    setMarkingPaid(reservationId);
    try {
      await updateReservation.mutateAsync({ 
        id: reservationId, 
        paid: true, 
        paid_at: new Date().toISOString() 
      });
      toast.success('Reservation markeret som betalt');
    } catch (error: any) {
      console.error('Error marking reservation as paid:', error);
      toast.error('Kunne ikke markere som betalt', { description: error.message });
    } finally {
      setMarkingPaid(null);
    }
  };

  const getUserDisplay = (userId: string) => {
    const profile = profilesMap[userId];
    if (profile?.full_name) {
      return profile.full_name;
    }
    if (profile?.email) {
      return profile.email;
    }
    return `${userId.slice(0, 8)}...`;
  };

  const getUserEmail = (userId: string) => {
    return profilesMap[userId]?.email || null;
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

      {/* Pending Payments Section */}
      {unpaidReservations.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600" />
            Afventende betalinger ({unpaidReservations.length})
          </h2>
          <div className="grid gap-4">
            {unpaidReservations.map((reservation) => {
              const product = products?.find(p => p.id === reservation.product_id);
              const totalPrice = (product?.price_per_unit || 0) * reservation.quantity;
              const userName = getUserDisplay(reservation.user_id);
              const userEmail = getUserEmail(reservation.user_id);
              
              return (
                <Card key={reservation.id} className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {product?.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{product?.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {reservation.quantity} {product?.unit_name}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">
                          {userName}
                        </p>
                        {userEmail && userName !== userEmail && (
                          <p className="text-xs text-muted-foreground">{userEmail}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {totalPrice.toFixed(2)} kr
                        </p>
                      </div>
                      <Button
                        onClick={() => markReservationAsPaid(reservation.id)}
                        disabled={markingPaid === reservation.id}
                        size="sm"
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {markingPaid === reservation.id ? 'Markerer...' : 'Marker betalt'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

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
            {arrivedProducts.map((product) => {
              const productReservations = reservationsByProduct?.[product.id] || [];
              const paidCount = productReservations.filter(r => r.paid).length;
              const unpaidCount = productReservations.length - paidCount;
              
              return (
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
                          Klar til afhentning • {productReservations.length} reservationer
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs">
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {paidCount} betalt
                          </span>
                          {unpaidCount > 0 && (
                            <span className="text-amber-600">
                              {unpaidCount} afventer betaling
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
