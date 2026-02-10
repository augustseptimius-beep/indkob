import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldOff, User } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, UserRole } from '@/lib/supabase-types';

interface UserWithRole extends Omit<Profile, 'email'> {
  isAdmin: boolean;
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingRole, setTogglingRole] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(adminRoles?.map((r) => r.user_id) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => ({
        ...profile,
        isAdmin: adminUserIds.has(profile.user_id),
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Kunne ikke hente brugere');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleAdminRole = async (userId: string, currentlyAdmin: boolean) => {
    setTogglingRole(userId);
    try {
      if (currentlyAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
        toast.success('Admin-rolle fjernet');
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;
        toast.success('Admin-rolle tilføjet');
      }

      // Refresh users list
      await fetchUsers();
    } catch (error: any) {
      console.error('Error toggling role:', error);
      toast.error('Kunne ikke ændre rolle');
    } finally {
      setTogglingRole(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Indlæser brugere...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Brugere ({users.length})</h2>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">
                      {user.full_name || 'Intet navn'}
                    </h3>
                    {user.isAdmin && (
                      <Badge className="bg-primary/20 text-primary">Admin</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Oprettet: {new Date(user.created_at).toLocaleDateString('da-DK')}
                  </p>
                </div>
                <Button
                  variant={user.isAdmin ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => toggleAdminRole(user.user_id, user.isAdmin)}
                  disabled={togglingRole === user.user_id}
                  className="flex items-center gap-2"
                >
                  {user.isAdmin ? (
                    <>
                      <ShieldOff className="h-4 w-4" />
                      Fjern admin
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Gør til admin
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Ingen brugere fundet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
