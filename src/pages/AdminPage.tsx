import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ClipboardList, FileText, Users, Key, Loader2, Mail, FolderOpen } from 'lucide-react';
import { AdminProducts } from '@/components/admin/AdminProducts';
import { AdminOrders } from '@/components/admin/AdminOrders';
import { AdminCMS } from '@/components/admin/AdminCMS';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminEmailTemplates } from '@/components/admin/AdminEmailTemplates';
import { AdminCategories } from '@/components/admin/AdminCategories';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function AdminPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncSigningKey = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: 'Fejl',
          description: 'Du skal være logget ind for at synkronisere',
          variant: 'destructive',
        });
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
        toast({
          title: 'Succes!',
          description: result.message || 'Signeringsnøgle synkroniseret til vault',
        });
      } else {
        toast({
          title: 'Fejl',
          description: result.error || 'Kunne ikke synkronisere nøgle',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: 'Fejl',
        description: 'Der opstod en netværksfejl',
        variant: 'destructive',
      });
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Administrer produkter, ordrer og indhold
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncSigningKey}
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Key className="h-4 w-4" />
            )}
            Synkroniser signeringsnøgle
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Produkter</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Kategorier</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Ordrer</span>
            </TabsTrigger>
            <TabsTrigger value="cms" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">CMS</span>
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Emails</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Brugere</span>
            </TabsTrigger>
          </TabsList>

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
        </Tabs>
      </div>
    </Layout>
  );
}
