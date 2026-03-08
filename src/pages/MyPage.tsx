import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useMyReservations, useDeleteReservation, useUpdateReservation } from '@/hooks/useReservations';
import { useProfile, useUnpaidReservationsCount } from '@/hooks/useProfile';
import { useCMSContent } from '@/hooks/useCMS';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { PasswordSettings } from '@/components/profile/PasswordSettings';
import { DeleteAccountSection } from '@/components/profile/DeleteAccountSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, CreditCard, Smartphone, Settings, ShoppingBag, CheckCircle, Minus, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function MyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: reservations, isLoading } = useMyReservations();
  const { data: profile, refetch: refetchProfile } = useProfile();
  const { data: unpaidCount } = useUnpaidReservationsCount();
  const { data: cmsContent } = useCMSContent();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reservations');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const deleteReservation = useDeleteReservation();
  const updateReservation = useUpdateReservation();

  if (authLoading) {
    return <Layout><div className="container-narrow py-12"><Skeleton className="h-64" /></div></Layout>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const totalPrice = reservations?.reduce((sum, r) => {
    const price = r.product?.price_per_unit || 0;
    return sum + price * r.quantity;
  }, 0) || 0;

  const unpaidAmount = reservations?.reduce((sum, r) => {
    if (r.paid) return sum;
    const price = r.product?.price_per_unit || 0;
    return sum + price * r.quantity;
  }, 0) || 0;

  const paidAmount = totalPrice - unpaidAmount;

  const unpaidReservations = reservations?.filter(r => 
    (r.status === 'ordered' || r.status === 'ready') && !r.paid
  ) || [];
  const hasPendingPayment = unpaidReservations.length > 0;
  const paymentInfo = cmsContent?.['payment_info'];

  const getStatusLabel = (status: string, product?: any) => {
    switch (status) {
      case 'pending': {
        if (product) {
          const remaining = product.target_quantity - product.current_quantity;
          if (remaining > 0) return `Afventer ${remaining} køb mere`;
        }
        return 'Afventer flere købere';
      }
      case 'ordered': return 'Bestilt hjem';
      case 'ready': return 'Klar til afhentning';
      case 'completed': return 'Afhentet';
      default: return status;
    }
  };

  const handleProfileUpdate = () => {
    refetchProfile();
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const startEditing = (reservationId: string, currentQuantity: number) => {
    setEditingId(reservationId);
    setEditQuantity(currentQuantity);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditQuantity(1);
  };

  const saveQuantity = async (reservationId: string) => {
    try {
      await updateReservation.mutateAsync({ id: reservationId, quantity: editQuantity });
      toast.success('Reservation opdateret');
      setEditingId(null);
    } catch (error: any) {
      toast.error(error.message || 'Kunne ikke opdatere reservation');
    }
  };

  const handleDelete = async (reservationId: string) => {
    try {
      await deleteReservation.mutateAsync(reservationId);
      toast.success('Reservation annulleret');
    } catch (error: any) {
      toast.error(error.message || 'Kunne ikke annullere reservation');
    }
  };

  return (
    <Layout>
      <div className="container-narrow py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold mb-2">Min side</h1>
            <p className="text-muted-foreground">
              Velkommen tilbage, {profile?.full_name || user.email}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Mine reservationer
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Indstillinger
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reservations" className="space-y-6">
            {/* Total */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary-foreground/80 text-sm">Skyldigt beløb</p>
                    <p className="text-3xl font-bold">{unpaidAmount.toFixed(2)} kr</p>
                  </div>
                  <CreditCard className="w-10 h-10 opacity-50" />
                </div>
                {paidAmount > 0 && (
                  <p className="text-primary-foreground/70 text-sm mt-2">
                    ✅ Allerede betalt: {paidAmount.toFixed(2)} kr
                  </p>
                )}
                {totalPrice > 0 && (
                  <p className="text-primary-foreground/60 text-xs mt-1">
                    Samlet beløb: {totalPrice.toFixed(2)} kr
                  </p>
                )}
                <p className="text-primary-foreground/70 text-sm mt-4">
                  💡 Betaling sker via MobilePay når varerne er bekræftet
                </p>
              </CardContent>
            </Card>

            {/* Payment Instructions */}
            {hasPendingPayment && paymentInfo?.content && (
              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-800 dark:text-green-300">
                        {paymentInfo.title || 'Betal med MobilePay'}
                      </h3>
                      <p className="text-green-700 dark:text-green-400 mt-1">
                        Overfør til MobilePay: <span className="font-bold text-lg">{paymentInfo.content}</span>
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500 mt-2">
                        Skriv dit fulde navn i beskedfeltet ved overførsel
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <h2 className="font-serif text-xl font-semibold">Mine reservationer</h2>

            {isLoading ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
            ) : reservations?.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground"><Package className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>Du har ingen reservationer endnu</p></CardContent></Card>
            ) : (
              <div className="space-y-4">
                {reservations?.map((reservation) => {
                  const isEditing = editingId === reservation.id;
                  const canModify = reservation.product?.status === 'open' && !reservation.paid;
                  const minPurchase = reservation.product?.minimum_purchase || 1;

                  return (
                    <Card key={reservation.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                          {/* Image */}
                          <Link to={`/produkt/${reservation.product_id}`} className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                            {reservation.product?.image_url ? (
                              <img src={reservation.product.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground/30" /></div>
                            )}
                          </Link>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <Link to={`/produkt/${reservation.product_id}`} className="hover:text-primary transition-colors">
                              <h3 className="font-semibold truncate">{reservation.product?.title}</h3>
                            </Link>

                            {isEditing ? (
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center border rounded-lg">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditQuantity(Math.max(minPurchase, editQuantity - 1))}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-10 text-center text-sm font-medium">{editQuantity}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditQuantity(editQuantity + 1)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                <span className="text-sm text-muted-foreground">{reservation.product?.unit_name}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                  onClick={() => saveQuantity(reservation.id)}
                                  disabled={updateReservation.isPending}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={cancelEditing}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {reservation.quantity} {reservation.product?.unit_name} × {reservation.product?.price_per_unit.toFixed(2)} kr
                              </p>
                            )}

                            {reservation.paid && (
                              <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                                <CheckCircle className="h-3 w-3" />
                                <span>Betalt</span>
                              </div>
                            )}
                          </div>

                          {/* Price & Status */}
                          {!isEditing && (
                            <div className="text-right flex flex-col items-end gap-2 shrink-0">
                              <p className="font-semibold">
                                {((reservation.product?.price_per_unit || 0) * reservation.quantity).toFixed(2)} kr
                              </p>
                              <Badge variant="secondary">{getStatusLabel(reservation.status, reservation.product)}</Badge>
                              {canModify && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => startEditing(reservation.id, reservation.quantity)}
                                  >
                                    <Pencil className="w-3 h-3 mr-1" />
                                    Ændr
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Annuller
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Annuller reservation?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Er du sikker på, at du vil annullere din reservation af{' '}
                                          <strong>{reservation.quantity} {reservation.product?.unit_name} {reservation.product?.title}</strong>?
                                          Denne handling kan ikke fortrydes.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Behold</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(reservation.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Ja, annuller
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ProfileSettings profile={profile} onUpdate={handleProfileUpdate} />
            <PasswordSettings />
            <DeleteAccountSection 
              hasUnpaidReservations={(unpaidCount || 0) > 0} 
              unpaidCount={unpaidCount || 0}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
