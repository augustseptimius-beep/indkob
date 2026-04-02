import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Key } from 'lucide-react';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from the auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoverySession(true);
      }
      setIsChecking(false);
    });

    // Also check the URL hash for recovery type (fallback)
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecoverySession(true);
      setIsChecking(false);
    }

    // Timeout fallback
    const timeout = setTimeout(() => setIsChecking(false), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Adgangskode skal være mindst 6 tegn');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Adgangskoderne matcher ikke');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Din adgangskode er blevet opdateret!');
      navigate('/min-side');
    } catch (error: any) {
      toast.error(error.message || 'Kunne ikke opdatere adgangskode');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <Layout>
        <div className="container-narrow py-16 md:py-24 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isRecoverySession) {
    return (
      <Layout>
        <div className="container-narrow py-16 md:py-24">
          <div className="max-w-md mx-auto text-center">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">Ugyldigt link</CardTitle>
                <CardDescription>
                  Dette link til nulstilling af adgangskode er ugyldigt eller udløbet. Prøv at anmode om et nyt.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/auth')} className="w-full">
                  Gå til login
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Nulstil adgangskode" noindex />
      <div className="container-narrow py-16 md:py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-2xl">Vælg ny adgangskode</CardTitle>
              <CardDescription>
                Indtast din nye adgangskode herunder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Ny adgangskode</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mindst 6 tegn"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Bekræft ny adgangskode</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Gentag adgangskode"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Opdater adgangskode
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
