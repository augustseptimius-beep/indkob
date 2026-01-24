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
  fullName: z.string().min(2, 'Navn skal være mindst 2 tegn').max(100, 'Navn må maks være 100 tegn'),
});

interface ProfileSettingsProps {
  profile: { full_name: string | null; email: string | null } | null;
  onUpdate: () => void;
}

export function ProfileSettings({ profile, onUpdate }: ProfileSettingsProps) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = profileSchema.safeParse({ fullName });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
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
              value={profile?.email || user?.email || ''} 
              disabled 
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email kan ikke ændres</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Fulde navn</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dit fulde navn"
            />
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
