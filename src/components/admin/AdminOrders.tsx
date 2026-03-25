import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProducts, useUpdateProduct } from '@/hooks/useProducts';
import { useAllReservations, useUpdateReservation } from '@/hooks/useReservations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Package, Truck, Mail, CreditCard, CheckCircle, Clock, Users } from 'lucide-react';
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

  const readyToOrder = products?.filter(
    (p) => p.status === 'open' && p.current_quantity >= p.target_quantity
  );

  const awaitingMore = useMemo(() => {
    if (!products || !allReservations) return [];
    const productIdsWithPending = new Set(
      allReservations.filter(r => r.status === 'pending').map(r => r.product_id)
    );
    return products.filter(
      p => p.status === 'open' && p.current_quantity < p.target_quantity && productIdsWithPending.has(p.id)
    );
  }, [products, allReservations]);

  const orderedReservationsByProduct = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    allReservations?.filter(r => r.status === 'ordered').forEach(r => {
      if (!map[r.product_id]) map[r.product_id] = [];
      map[r.product_id].push(r);
    });
    return map;
  }, [allReservations]);

  const readyReservationsByProduct = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    allReservations?.filter(r => r.status === 'ready').forEach(r => {
      if (!map[r.product_id]) map[r.product_id] = [];
      map[r.product_id].push(r);
    });
    return map;
  }, [allReservations]);

  const unpaidReservations = allReservations?.filter(
    (r) => (r.status === 'ordered' || r.status === 'ready') && !r.paid
  ) || [];

  const pendingReservationsByProduct = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    allReservations?.filter(r => r.status === 'pending').forEach(r => {
      if (!map[r.product_id]) map[r.product_id] = [];
      map[r.product_id].push(r);
    });
    return map;
  }, [allReservations]);

  const orderedProductIds = Object.keys(orderedReservationsByProduct);
  const readyProductIds = Object.keys(readyReservationsByProduct);

  const stats = useMemo(() => ({
    unpaidPayments: unpaidReservations.length,
    readyToOrder: readyToOrder?.length || 0,
    orderedBatches: orderedProductIds.length,
    readyForPickup: readyProductIds.length,
  }), [unpaidReservations, readyToOrder, orderedProductIds, readyProductIds]);

  const markProductAsOrdered = async (productId: string) => {
    setUpdatingStatus(productId);
    try {
      await updateProduct.mutateAsync({ id: productId, status: 'ordered' });
      toast.success('Produktet er bestilt hjem', {
        description: 'Reservationer er markeret som bestilt. Produktet er åbent igen for nye tilmeldinger.',
        icon: <Mail className="h-4 w-4" />
      });
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
      toast.success(`${batch.length} reservationer markeret som klar til afhentning`, { icon: <Package className="h-4 w-4" /> });
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
      await updateReservation.mutateAsync({ id: reservationId, paid: true, paid_at: new Date().toISOString() });
      toast.success('Reservation markeret som betalt — betalingsbekræftelse sendt');
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

  return (
    <div className="space-y-8">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className={stats.unpaidPayments > 0 ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' : ''}>
          <CardContent className="p-4 text-center">
            <CreditCard className="h-5 w-5 mx-auto mb-1 text-amber-600" />
            <div className="text-2xl font-bold">{stats.unpaidPayments}</div>
            <div className="text-xs text-muted-foreground">Ubetalte</div>
          </CardContent>
        </Card>
        <Card className={stats.readyToOrder > 0 ? 'border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : ''}>
          <CardContent className="p-4 text-center">
            <Check className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <div className="text-2xl font-bold">{stats.readyToOrder}</div>
            <div className="text-xs text-muted-foreground">Klar til bestilling</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Truck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.orderedBatches}</div>
            <div className="text-xs text-muted-foreground">Bestilte batches</div>
          </CardContent>
        </Card>
        <Card className={stats.readyForPickup > 0 ? 'border-primary/30 bg-primary/5' : ''}>
          <CardContent className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold">{stats.readyForPickup}</div>
            <div className="text-xs text-muted-foreground">Klar til afhentning</div>
          </CardContent>
        </Card>
      </div>

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

      {/* Pending Payments Section — grouped by product */}
      {unpaidReservations.length > 0 && (() => {
        const grouped: Record<string, typeof unpaidReservations> = {};
        unpaidReservations.forEach(r => {
          if (!grouped[r.product_id]) grouped[r.product_id] = [];
          grouped[r.product_id].push(r);
        });

        return (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              Afventende betalinger ({unpaidReservations.length})
            </h2>
            <div className="grid gap-4">
              {Object.entries(grouped).map(([productId, reservations]) => {
                const product = getProductById(productId);
                const totalQty = reservations.reduce((s, r) => s + r.quantity, 0);
                const totalAmount = reservations.reduce((s, r) => s + (product?.price_per_unit || 0) * r.quantity, 0);

                return (
                  <Card key={productId} className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {product?.image_url && (
                          <img src={product.image_url} alt={product.title} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm truncate">{product?.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {reservations.length} ubetalt{reservations.length !== 1 ? 'e' : ''} — {totalQty} {product?.unit_name} — {totalAmount.toFixed(2)} kr
                          </p>
                        </div>
                      </div>
                      <div className="divide-y divide-amber-200 dark:divide-amber-800">
                        {reservations.map(r => {
                          const price = (product?.price_per_unit || 0) * r.quantity;
                          return (
                            <div key={r.id} className="flex items-center justify-between gap-2 py-2">
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium truncate block">{getUserDisplay(r.user_id)}</span>
                                <span className="text-xs text-muted-foreground">{r.quantity} {product?.unit_name} — {price.toFixed(2)} kr</span>
                              </div>
                              <Button
                                onClick={() => markReservationAsPaid(r.id)}
                                disabled={markingPaid === r.id}
                                size="sm"
                                className="h-7 text-xs bg-green-600 hover:bg-green-700 shrink-0"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {markingPaid === r.id ? '...' : 'Betalt'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Ready to Order */}
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {product.image_url && (
                          <img src={product.image_url} alt={product.title} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold truncate">{product.title}</h3>
                            <Badge className="bg-green-100 text-green-800">Mål nået</Badge>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Progress value={(product.current_quantity / product.target_quantity) * 100} className="h-2 flex-1" />
                            <span className="text-sm font-medium whitespace-nowrap">{product.current_quantity} / {product.target_quantity}</span>
                          </div>
                          <div className="bg-background/60 rounded-lg p-3 space-y-2 mt-2">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              {pendingCount} reservationer klar til bestilling
                            </p>
                            <div className="divide-y divide-border">
                              {(pendingReservationsByProduct[product.id] || []).map(r => (
                                <div key={r.id} className="flex items-center justify-between py-1.5 text-sm">
                                  <span className="font-medium truncate">{getUserDisplay(r.user_id)}</span>
                                  <span className="text-muted-foreground whitespace-nowrap ml-2">{r.quantity} {product.unit_name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => markProductAsOrdered(product.id)}
                        disabled={updatingStatus === product.id}
                        className="flex items-center gap-2 w-full sm:w-auto"
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

      {/* Ordered Batches */}
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
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {product?.image_url && (
                          <img src={product.image_url} alt={product?.title || ''} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate mb-1">{product?.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {batch.length} reservationer — {totalQuantity} {product?.unit_name} total
                          </p>
                          <div className="space-y-1.5">
                            {batch.map(r => (
                              <div key={r.id} className="flex items-center gap-2 py-1.5 text-sm border-b border-border last:border-0">
                                <span className="font-medium truncate flex-1 min-w-0">{getUserDisplay(r.user_id)}</span>
                                <span className="text-muted-foreground whitespace-nowrap text-xs">{r.quantity} {product?.unit_name}</span>
                                {r.paid ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs shrink-0">Betalt</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 shrink-0">Ubetalt</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => markBatchAsArrived(productId)}
                        disabled={updatingBatch === productId}
                        variant="outline"
                        className="flex items-center gap-2 w-full sm:w-auto"
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
              Ingen bestilte batches.
            </CardContent>
          </Card>
        )}
      </section>

      {/* Ready for Pickup — above awaiting more */}
      {readyProductIds.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Klar til afhentning ({readyProductIds.length})
          </h2>
          <div className="grid gap-4">
            {readyProductIds.map((productId) => {
              const product = getProductById(productId);
              const batch = readyReservationsByProduct[productId];
              const totalQuantity = batch.reduce((sum, r) => sum + r.quantity, 0);
              
              return (
                <Card key={productId} className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {product?.image_url && (
                        <img src={product.image_url} alt={product?.title || ''} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate mb-1">{product?.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {batch.length} reservationer — {totalQuantity} {product?.unit_name} total
                        </p>
                        <div className="space-y-2">
                          {batch.map(r => (
                            <div key={r.id} className="flex flex-col gap-1.5 py-2 border-b border-border last:border-0 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium truncate text-sm">{getUserDisplay(r.user_id)}</span>
                                <span className="text-muted-foreground text-sm whitespace-nowrap">{r.quantity} {product?.unit_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {r.paid ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs">Betalt</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Ubetalt</Badge>
                                )}
                                {r.paid ? (
                                  <Button
                                    onClick={() => markReservationAsCompleted(r.id)}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                  >
                                    Marker afhentet
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => markReservationAsPaid(r.id)}
                                    disabled={markingPaid === r.id}
                                    size="sm"
                                    className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                  >
                                    {markingPaid === r.id ? '...' : 'Marker betalt'}
                                  </Button>
                                )}
                              </div>
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
        </section>
      )}

      {/* Awaiting more — below ready for pickup */}
      {awaitingMore.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Afventer flere tilmeldinger ({awaitingMore.length})
          </h2>
          <div className="grid gap-4">
            {awaitingMore.map((product) => {
              const pending = pendingReservationsByProduct[product.id] || [];
              const totalPendingQty = pending.reduce((sum, r) => sum + r.quantity, 0);
              const progressVal = (product.current_quantity / product.target_quantity) * 100;
              const remaining = product.target_quantity - product.current_quantity;

              return (
                <Card key={product.id} className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {product.image_url && (
                        <img src={product.image_url} alt={product.title} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold truncate">{product.title}</h3>
                          <Badge variant="outline" className="text-xs">Mangler {remaining} {product.unit_name}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <Progress value={progressVal} className="h-2 flex-1" />
                          <span className="text-sm font-medium whitespace-nowrap">{product.current_quantity} / {product.target_quantity} {product.unit_name}</span>
                        </div>
                        <div className="bg-background/60 rounded-lg p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {pending.length} tilmelding{pending.length !== 1 ? 'er' : ''} — {totalPendingQty} {product.unit_name} reserveret
                          </p>
                          <div className="divide-y divide-border">
                            {pending.map(r => (
                              <div key={r.id} className="flex items-center justify-between py-1.5 text-sm">
                                <span className="font-medium truncate">{getUserDisplay(r.user_id)}</span>
                                <span className="text-muted-foreground whitespace-nowrap ml-2">{r.quantity} {product.unit_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
