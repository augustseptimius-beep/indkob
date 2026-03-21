import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Package, ClipboardList, FileText, Users, Key, Loader2, Mail, FolderOpen, ScrollText, History, Megaphone, Menu } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { key: 'products', label: 'Produkter', icon: Package },
  { key: 'categories', label: 'Kategorier', icon: FolderOpen },
  { key: 'orders', label: 'Ordrer', icon: ClipboardList, badgeKey: 'unpaid' as const },
  { key: 'order-history', label: 'Historik', icon: History },
  { key: 'cms', label: 'CMS', icon: FileText },
  { key: 'emails', label: 'Email-skabeloner', icon: Mail },
  { key: 'broadcast', label: 'Broadcast', icon: Megaphone },
  { key: 'email-log', label: 'Email-log', icon: ScrollText, badgeKey: 'failedEmail' as const },
  { key: 'users', label: 'Brugere', icon: Users },
];

export default function AdminPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [isSyncing, setIsSyncing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const badges: Record<string, number> = {
    unpaid: unpaidCount || 0,
    failedEmail: failedEmailCount || 0,
  };

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

  const handleNavClick = (key: string) => {
    setActiveTab(key);
    setMobileOpen(false);
  };

  const SidebarNav = () => (
    <nav className="flex flex-col gap-1 py-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => handleNavClick(item.key)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {badgeCount > 0 && (
              <Badge
                className={cn(
                  'h-5 min-w-5 px-1 text-[10px] leading-none',
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-destructive text-destructive-foreground'
                )}
              >
                {badgeCount}
              </Badge>
            )}
          </button>
        );
      })}

      <div className="border-t my-2" />
      <button
        onClick={handleSyncSigningKey}
        disabled={isSyncing}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left w-full disabled:opacity-50"
      >
        {isSyncing ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <Key className="h-4 w-4 shrink-0" />
        )}
        <span>Synk nøgle</span>
      </button>
    </nav>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'products': return <AdminProducts />;
      case 'categories': return <AdminCategories />;
      case 'orders': return <AdminOrders />;
      case 'order-history': return <AdminOrderHistory />;
      case 'cms': return <AdminCMS />;
      case 'emails': return <AdminEmailTemplates />;
      case 'broadcast': return <AdminBroadcastEmail />;
      case 'email-log': return <AdminEmailLog />;
      case 'users': return <AdminUsers />;
      default: return <AdminProducts />;
    }
  };

  const activeItem = navItems.find((i) => i.key === activeTab);

  return (
    <Layout>
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r bg-card flex-col p-3">
          <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin
          </h2>
          <SidebarNav />
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 border-b px-4 py-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-3 pt-8">
                <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin
                </h2>
                <SidebarNav />
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold text-lg truncate">
              {activeItem?.label || 'Admin'}
            </h1>
          </div>

          <div className="p-4 lg:p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
}
