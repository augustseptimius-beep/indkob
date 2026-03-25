import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, PiggyBank, ShoppingCart, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';

function formatKr(amount: number) {
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

interface PaidReservation {
  quantity: number;
  product: { price_per_unit: number; comparison_price: number | null } | null;
}

interface ReservationWithProduct {
  product_id: string;
  quantity: number;
  product: { title: string; price_per_unit: number; image_url: string | null } | null;
}

interface RecentReservation {
  id: string;
  quantity: number;
  status: string;
  created_at: string;
  paid: boolean;
  product: { title: string; price_per_unit: number } | null;
  profile: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

export function AdminDashboard() {
  const { data: userCount, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-dashboard-users'],
    queryFn: async () => {
      const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['admin-dashboard-sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('quantity, product:products(price_per_unit, comparison_price)')
        .eq('paid', true);
      if (error) throw error;
      const rows = (data || []) as unknown as PaidReservation[];
      let totalSold = 0;
      let totalSaved = 0;
      for (const r of rows) {
        if (!r.product) continue;
        const revenue = r.quantity * r.product.price_per_unit;
        totalSold += revenue;
        if (r.product.comparison_price && r.product.comparison_price > r.product.price_per_unit) {
          totalSaved += (r.product.comparison_price - r.product.price_per_unit) * r.quantity;
        }
      }
      return { totalSold, totalSaved, paidCount: rows.length };
    },
  });

  const { data: activeCount, isLoading: loadingActive } = useQuery({
    queryKey: ['admin-dashboard-active'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'ordered', 'ready']);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: topProducts, isLoading: loadingTop } = useQuery({
    queryKey: ['admin-dashboard-top-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('product_id, quantity, product:products(title, price_per_unit, image_url)');
      if (error) throw error;
      const rows = (data || []) as unknown as ReservationWithProduct[];
      const map = new Map<string, { title: string; image_url: string | null; totalQty: number; totalRevenue: number }>();
      for (const r of rows) {
        if (!r.product) continue;
        const existing = map.get(r.product_id);
        if (existing) {
          existing.totalQty += r.quantity;
          existing.totalRevenue += r.quantity * r.product.price_per_unit;
        } else {
          map.set(r.product_id, {
            title: r.product.title,
            image_url: r.product.image_url,
            totalQty: r.quantity,
            totalRevenue: r.quantity * r.product.price_per_unit,
          });
        }
      }
      return Array.from(map.values())
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 5);
    },
  });

  const { data: recentActivity, isLoading: loadingRecent } = useQuery({
    queryKey: ['admin-dashboard-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, quantity, status, created_at, paid, product:products(title, price_per_unit)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      
      // Fetch profiles for user names
      const { data: resWithUser } = await supabase
        .from('reservations')
        .select('id, user_id')
        .in('id', (data || []).map(d => d.id));
      
      const userIds = [...new Set((resWithUser || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const userMap = new Map((resWithUser || []).map(r => [r.id, r.user_id]));
      
      return (data || []).map(d => ({
        ...d,
        profile: profileMap.get(userMap.get(d.id) || '') || null,
      })) as unknown as RecentReservation[];
    },
  });

  const statusLabels: Record<string, string> = {
    pending: 'Afventer',
    ordered: 'Bestilt',
    ready: 'Klar',
    completed: 'Afhentet',
  };

  const stats = [
    { label: 'Brugere', value: userCount, icon: Users, loading: loadingUsers, format: (v: number) => v.toString() },
    { label: 'Solgt for', value: salesData?.totalSold, icon: DollarSign, loading: loadingSales, format: formatKr },
    { label: 'Besparelse', value: salesData?.totalSaved, icon: PiggyBank, loading: loadingSales, format: formatKr },
    { label: 'Aktive reservationer', value: activeCount, icon: ShoppingCart, loading: loadingActive, format: (v: number) => v.toString() },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold hidden lg:block">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {s.loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold">{s.format(s.value ?? 0)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top 5 produkter
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTop ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !topProducts?.length ? (
              <p className="p-6 text-sm text-muted-foreground">Ingen reservationer endnu.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produkt</TableHead>
                    <TableHead className="text-right">Antal</TableHead>
                    <TableHead className="text-right">Omsætning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {p.image_url && (
                            <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                          )}
                          <span className="truncate max-w-[180px]">{p.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{p.totalQty}</TableCell>
                      <TableCell className="text-right">{formatKr(p.totalRevenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Seneste aktivitet</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingRecent ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !recentActivity?.length ? (
              <p className="p-6 text-sm text-muted-foreground">Ingen aktivitet endnu.</p>
            ) : (
              <div className="divide-y">
                {recentActivity.map((r) => {
                  const name = [r.profile?.first_name, r.profile?.last_name].filter(Boolean).join(' ') || r.profile?.email || 'Ukendt';
                  return (
                    <div key={r.id} className="flex items-center justify-between px-6 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.quantity}× {r.product?.title || '—'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                        <Badge variant={r.paid ? 'default' : 'secondary'} className="text-[10px]">
                          {statusLabels[r.status] || r.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: da })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
