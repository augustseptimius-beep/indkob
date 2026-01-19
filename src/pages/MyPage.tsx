import { Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useMyReservations } from '@/hooks/useReservations';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, CreditCard } from 'lucide-react';

export default function MyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: reservations, isLoading } = useMyReservations();

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Afventer flere købere';
      case 'ordered': return 'Bestilt hjem';
      case 'ready': return 'Klar til afhentning';
      case 'completed': return 'Afhentet';
      default: return status;
    }
  };

  return (
    <Layout>
      <div className="container-narrow py-12">
        <h1 className="font-serif text-3xl font-bold mb-2">Min side</h1>
        <p className="text-muted-foreground mb-8">Oversigt over dine reservationer</p>

        {/* Total */}
        <Card className="mb-8 bg-primary text-primary-foreground">
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

        <h2 className="font-serif text-xl font-semibold mb-4">Mine reservationer</h2>

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
      </div>
    </Layout>
  );
}
