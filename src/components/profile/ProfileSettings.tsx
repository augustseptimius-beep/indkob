import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Save, Loader2 } from 'lucide-react';
import { z } from 'zod';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Fornavn er påkrævet').max(50, 'Fornavn må maks være 50 tegn'),
  lastName: z.string().min(1, 'Efternavn er påkrævet').max(50, 'Efternavn må maks være 50 tegn'),
});

interface ProfileSettingsProps {
  profile: { first_name: string | null; last_name: string | null; full_name: string | null } | null;
  onUpdate: () => void;
}

export function ProfileSettings({ profile, onUpdate }: ProfileSettingsProps) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = profileSchema.safeParse({ firstName, lastName });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName, 
          last_name: lastName, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profil opdateret');
      onUpdate();
    } catch (error: any) {
      toast.error('Kunne ikke opdatere profil', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profiloplysninger
        </CardTitle>
        <CardDescription>Opdater dit navn og andre oplysninger</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              value={user?.email || ''} 
              disabled 
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email kan ikke ændres</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Fornavn</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Fornavn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Efternavn</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Efternavn"
              />
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Gem ændringer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
