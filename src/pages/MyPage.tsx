import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useMyReservations } from '@/hooks/useReservations';
import { useProfile, useUnpaidReservationsCount } from '@/hooks/useProfile';
import { useCMSContent } from '@/hooks/useCMS';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { PasswordSettings } from '@/components/profile/PasswordSettings';
import { DeleteAccountSection } from '@/components/profile/DeleteAccountSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, CreditCard, Smartphone, Settings, ShoppingBag, CheckCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function MyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: reservations, isLoading } = useMyReservations();
  const { data: profile, refetch: refetchProfile } = useProfile();
  const { data: unpaidCount } = useUnpaidReservationsCount();
  const { data: cmsContent } = useCMSContent();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reservations');

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

  // Check if any reservations are ready for payment (ordered or ready status) AND not paid
  const unpaidReservations = reservations?.filter(r => 
    (r.status === 'ordered' || r.status === 'ready') && !r.paid
  ) || [];
  const hasPendingPayment = unpaidReservations.length > 0;
  const paymentInfo = cmsContent?.['payment_info'];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Afventer flere købere';
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
                    <p className="text-primary-foreground/80 text-sm">Samlet beløb</p>
                    <p className="text-3xl font-bold">{totalPrice.toFixed(2)} kr</p>
                  </div>
                  <CreditCard className="w-10 h-10 opacity-50" />
                </div>
                <p className="text-primary-foreground/70 text-sm mt-4">
                  💡 Betaling sker via MobilePay når varerne er bekræftet
                </p>
              </CardContent>
            </Card>

            {/* Payment Instructions - shown when reservations are ready and not paid */}
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
                {reservations?.map((reservation) => (
                  <Card key={reservation.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                          {reservation.product?.image_url ? (
                            <img src={reservation.product.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground/30" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{reservation.product?.title}</h3>
                          <p className="text-sm text-muted-foreground">{reservation.quantity} {reservation.product?.unit_name} × {reservation.product?.price_per_unit.toFixed(2)} kr</p>
                          {reservation.paid && (
                            <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>Betalt</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{((reservation.product?.price_per_unit || 0) * reservation.quantity).toFixed(2)} kr</p>
                          <Badge variant="secondary" className="mt-1">{getStatusLabel(reservation.status)}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
