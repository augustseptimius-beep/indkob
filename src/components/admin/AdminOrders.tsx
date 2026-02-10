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
import type { Reservation } from '@/lib/supabase-types';

export function AdminOrders() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: allReservations, isLoading: reservationsLoading } = useAllReservations();
  const updateProduct = useUpdateProduct();
  const updateReservation = useUpdateReservation();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [updatingBatch, setUpdatingBatch] = useState<string | null>(null);

  // Fetch all profiles for admin view
  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name');
      if (error) throw error;
      return data;
    },
  });

  const profilesMap = useMemo(() => {
    const map: Record<string, { full_name: string | null }> = {};
    profiles?.forEach(p => { map[p.user_id] = p; });
    return map;
  }, [profiles]);

  const isLoading = productsLoading || reservationsLoading;

  // Products ready to order (target reached, status open)
  const readyToOrder = products?.filter(
    (p) => p.status === 'open' && p.current_quantity >= p.target_quantity
  );

  // Group ordered reservations by product (batch tracking)
  const orderedReservationsByProduct = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    allReservations?.filter(r => r.status === 'ordered').forEach(r => {
      if (!map[r.product_id]) map[r.product_id] = [];
      map[r.product_id].push(r);
    });
    return map;
  }, [allReservations]);

  // Group ready reservations by product (arrived batches)
  const readyReservationsByProduct = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    allReservations?.filter(r => r.status === 'ready').forEach(r => {
      if (!map[r.product_id]) map[r.product_id] = [];
      map[r.product_id].push(r);
    });
    return map;
  }, [allReservations]);

  // Unpaid reservations across ordered + ready
  const unpaidReservations = allReservations?.filter(
    (r) => (r.status === 'ordered' || r.status === 'ready') && !r.paid
  ) || [];

  // Count pending reservations per product (for ready-to-order section)
  const pendingReservationsByProduct = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    allReservations?.filter(r => r.status === 'pending').forEach(r => {
      if (!map[r.product_id]) map[r.product_id] = [];
      map[r.product_id].push(r);
    });
    return map;
  }, [allReservations]);

  const markProductAsOrdered = async (productId: string) => {
    setUpdatingStatus(productId);
    try {
      // This triggers the DB trigger which:
      // 1. Marks all pending reservations as 'ordered'
      // 2. Resets current_quantity to 0
      // 3. Sets product status back to 'open'
      await updateProduct.mutateAsync({ id: productId, status: 'ordered' });
      toast.success(
        'Produktet er bestilt hjem',
        { 
          description: 'Reservationer er markeret som bestilt. Produktet er åbent igen for nye tilmeldinger.',
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

  const markBatchAsArrived = async (productId: string) => {
    setUpdatingBatch(productId);
    try {
      const batch = orderedReservationsByProduct[productId] || [];
      for (const reservation of batch) {
        await updateReservation.mutateAsync({ id: reservation.id, status: 'ready' });
      }
      toast.success(
        `${batch.length} reservationer markeret som klar til afhentning`,
        { icon: <Package className="h-4 w-4" /> }
      );
    } catch (error: any) {
      console.error('Error marking batch as arrived:', error);
      toast.error('Kunne ikke opdatere batch', { description: error.message });
    } finally {
      setUpdatingBatch(null);
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

  const markReservationAsCompleted = async (reservationId: string) => {
    try {
      await updateReservation.mutateAsync({ id: reservationId, status: 'completed' });
      toast.success('Reservation markeret som afhentet');
    } catch (error: any) {
      toast.error('Kunne ikke opdatere', { description: error.message });
    }
  };

  const getUserDisplay = (userId: string) => {
    const profile = profilesMap[userId];
    if (profile?.full_name) return profile.full_name;
    return `${userId.slice(0, 8)}...`;
  };

  const getProductById = (productId: string) => {
    return products?.find(p => p.id === productId);
  };

  if (isLoading) {
    return <div className="text-center py-8">Indlæser ordrer...</div>;
  }

  const orderedProductIds = Object.keys(orderedReservationsByProduct);
  const readyProductIds = Object.keys(readyReservationsByProduct);

  return (
    <div className="space-y-8">
      {/* Info banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <p className="text-sm">
              <strong>Automatiske notifikationer:</strong> Når du markerer "Bestil hjem", opdateres reservationer automatisk og produktet genåbner for nye tilmeldinger.
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
              const product = getProductById(reservation.product_id);
              const totalPrice = (product?.price_per_unit || 0) * reservation.quantity;
              const userName = getUserDisplay(reservation.user_id);
              
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
                        <p className="text-sm font-medium">{userName}</p>
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

      {/* Ready to Order - products where target is reached */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          Klar til bestilling ({readyToOrder?.length || 0})
        </h2>
        {readyToOrder && readyToOrder.length > 0 ? (
          <div className="grid gap-4">
            {readyToOrder.map((product) => {
              const pendingCount = pendingReservationsByProduct[product.id]?.length || 0;
              return (
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
                          <Badge className="bg-green-100 text-green-800">Mål nået</Badge>
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
                          {pendingCount} reservationer klar til bestilling
                        </p>
                      </div>
                      <Button
                        onClick={() => markProductAsOrdered(product.id)}
                        disabled={updatingStatus === product.id}
                        className="flex items-center gap-2"
                      >
                        <Truck className="h-4 w-4" />
                        {updatingStatus === product.id ? 'Bestiller...' : 'Bestil hjem'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Ingen produkter har nået deres mål endnu.
            </CardContent>
          </Card>
        )}
      </section>

      {/* Ordered Batches - reservations with status 'ordered', grouped by product */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-accent" />
          Bestilte batches ({orderedProductIds.length})
        </h2>
        {orderedProductIds.length > 0 ? (
          <div className="grid gap-4">
            {orderedProductIds.map((productId) => {
              const product = getProductById(productId);
              const batch = orderedReservationsByProduct[productId];
              const totalQuantity = batch.reduce((sum, r) => sum + r.quantity, 0);
              
              return (
                <Card key={productId} className="border-accent/30 bg-accent/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {product?.image_url && (
                        <img
                          src={product.image_url}
                          alt={product?.title || ''}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{product?.title}</h3>
                          <Badge className="bg-accent/20 text-accent-foreground">Bestilt</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {totalQuantity} {product?.unit_name} fordelt på {batch.length} reservationer
                        </p>
                        <div className="mt-2 space-y-1">
                          {batch.map(r => (
                            <div key={r.id} className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{getUserDisplay(r.user_id)}</span>
                              <span>•</span>
                              <span>{r.quantity} {product?.unit_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={() => markBatchAsArrived(productId)}
                        disabled={updatingBatch === productId}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Package className="h-4 w-4" />
                        {updatingBatch === productId ? 'Opdaterer...' : 'Marker ankommet'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Ingen batches afventer levering.
            </CardContent>
          </Card>
        )}
      </section>

      {/* Arrived Batches - reservations with status 'ready', grouped by product */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-green-600" />
          Ankomne batches ({readyProductIds.length})
        </h2>
        {readyProductIds.length > 0 ? (
          <div className="grid gap-4">
            {readyProductIds.map((productId) => {
              const product = getProductById(productId);
              const batch = readyReservationsByProduct[productId];
              const paidCount = batch.filter(r => r.paid).length;
              const unpaidCount = batch.length - paidCount;
              
              return (
                <Card key={productId}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {product?.image_url && (
                        <img
                          src={product.image_url}
                          alt={product?.title || ''}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{product?.title}</h3>
                          <Badge className="bg-green-100 text-green-800">Klar til afhentning</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs mb-3">
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
                        <div className="space-y-2">
                          {batch.map(r => (
                            <div key={r.id} className="flex items-center justify-between text-sm border-t pt-2">
                              <div>
                                <span className="font-medium">{getUserDisplay(r.user_id)}</span>
                                <span className="text-muted-foreground ml-2">{r.quantity} {product?.unit_name}</span>
                                {r.paid && <Badge variant="outline" className="ml-2 text-xs text-green-600">Betalt</Badge>}
                              </div>
                              {r.status === 'ready' && r.paid && (
                                <Button
                                  onClick={() => markReservationAsCompleted(r.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Afhentet
                                </Button>
                              )}
                            </div>
                          ))}
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
              Ingen batches er ankommet endnu.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
