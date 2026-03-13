import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/useProducts';
import { useUpdateReservation } from '@/hooks/useReservations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Search, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import type { Reservation } from '@/lib/supabase-types';

export function AdminOrderHistory() {
  const { data: products } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: completedReservations, isLoading } = useQuery({
    queryKey: ['completed-reservations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(`*, product:products(*)`)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Reservation[];
    },
  });

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

  const getUserDisplay = (userId: string) => {
    const profile = profilesMap[userId];
    if (profile?.full_name) return profile.full_name;
    return `${userId.slice(0, 8)}...`;
  };

  // Group by product
  const groupedByProduct = useMemo(() => {
    if (!completedReservations) return [];
    const map: Record<string, { product: Reservation['product']; reservations: Reservation[] }> = {};
    completedReservations.forEach(r => {
      if (!map[r.product_id]) {
        map[r.product_id] = { product: r.product, reservations: [] };
      }
      map[r.product_id].reservations.push(r);
    });
    return Object.entries(map)
      .map(([productId, data]) => ({ productId, ...data }))
      .filter(group => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        if (group.product?.title?.toLowerCase().includes(term)) return true;
        return group.reservations.some(r => getUserDisplay(r.user_id).toLowerCase().includes(term));
      });
  }, [completedReservations, searchTerm, profilesMap]);

  const totalCompleted = completedReservations?.length || 0;

  if (isLoading) {
    return <div className="text-center py-8">Indlæser historik...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Ordrehistorik ({totalCompleted} afsluttede)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gennemførte, betalte og afhentede ordrer
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søg produkt eller medlem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {groupedByProduct.length > 0 ? (
        <div className="grid gap-4">
          {groupedByProduct.map(({ productId, product, reservations }) => {
            const totalQuantity = reservations.reduce((sum, r) => sum + r.quantity, 0);
            const paidCount = reservations.filter(r => r.paid).length;
            
            return (
              <Card key={productId} className="border-muted">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {product?.image_url && (
                      <img src={product.image_url} alt={product.title} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{product?.title}</h3>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Afsluttet
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {reservations.length} reservationer — {totalQuantity} {product?.unit_name} total — {paidCount}/{reservations.length} betalt
                      </p>
                      <div className="space-y-1.5">
                        {reservations.map(r => (
                          <div key={r.id} className="flex items-center justify-between text-sm opacity-80">
                            <span className="font-medium truncate">{getUserDisplay(r.user_id)}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{r.quantity} {product?.unit_name}</span>
                              {r.paid ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">Betalt</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Ubetalt</Badge>
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
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {searchTerm ? 'Ingen resultater fundet.' : 'Ingen afsluttede ordrer endnu.'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
