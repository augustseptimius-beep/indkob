import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ClipboardList, FileText, Users, Key, Loader2, Mail, FolderOpen, ScrollText, History, Megaphone } from 'lucide-react';
import { AdminProducts } from '@/components/admin/AdminProducts';
import { AdminOrders } from '@/components/admin/AdminOrders';
import { AdminCMS } from '@/components/admin/AdminCMS';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminEmailTemplates } from '@/components/admin/AdminEmailTemplates';
import { AdminCategories } from '@/components/admin/AdminCategories';
import { AdminEmailLog } from '@/components/admin/AdminEmailLog';
import { AdminOrderHistory } from '@/components/admin/AdminOrderHistory';
import { AdminBroadcastEmail } from '@/components/admin/AdminBroadcastEmail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function AdminPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch counts for notification badges
  const { data: unpaidCount } = useQuery({
    queryKey: ['admin-unpaid-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['ordered', 'ready'])
        .eq('paid', false);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: failedEmailCount } = useQuery({
    queryKey: ['admin-failed-email-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const handleSyncSigningKey = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: 'Fejl', description: 'Du skal være logget ind for at synkronisere', variant: 'destructive' });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-signing-key`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast({ title: 'Succes!', description: result.message || 'Signeringsnøgle synkroniseret til vault' });
      } else {
        toast({ title: 'Fejl', description: result.error || 'Kunne ikke synkronisere nøgle', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({ title: 'Fejl', description: 'Der opstod en netværksfejl', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const TabBadge = ({ count, variant = 'default' }: { count: number; variant?: 'default' | 'destructive' }) => {
    if (!count) return null;
    return (
      <Badge
        className={`ml-1 h-5 min-w-5 px-1 text-[10px] leading-none ${
          variant === 'destructive' 
            ? 'bg-destructive text-destructive-foreground' 
            : 'bg-primary text-primary-foreground'
        }`}
      >
        {count}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Administrer produkter, ordrer og indhold
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncSigningKey}
              disabled={isSyncing}
              className="flex items-center gap-2 self-start"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Synkroniser signeringsnøgle</span>
              <span className="sm:hidden">Synk nøgle</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="products" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Produkter</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Kategorier</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Ordrer</span>
                <TabBadge count={unpaidCount || 0} variant="destructive" />
              </TabsTrigger>
              <TabsTrigger value="cms" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">CMS</span>
              </TabsTrigger>
              <TabsTrigger value="emails" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Emails</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Brugere</span>
              </TabsTrigger>
              <TabsTrigger value="order-history" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Historik</span>
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Megaphone className="h-4 w-4" />
                <span className="hidden sm:inline">Broadcast</span>
              </TabsTrigger>
              <TabsTrigger value="email-log" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <ScrollText className="h-4 w-4" />
                <span className="hidden sm:inline">Log</span>
                <TabBadge count={failedEmailCount || 0} variant="destructive" />
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="products">
            <AdminProducts />
          </TabsContent>

          <TabsContent value="orders">
            <AdminOrders />
          </TabsContent>

          <TabsContent value="categories">
            <AdminCategories />
          </TabsContent>

          <TabsContent value="cms">
            <AdminCMS />
          </TabsContent>

          <TabsContent value="emails">
            <AdminEmailTemplates />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="order-history">
            <AdminOrderHistory />
          </TabsContent>

          <TabsContent value="email-log">
            <AdminEmailLog />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
