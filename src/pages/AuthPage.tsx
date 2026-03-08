import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? false : true;
  const [isLogin, setIsLogin] = useState(initialMode);
  const [isRecovery, setIsRecovery] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsLogin(mode !== 'signup');
  }, [searchParams]);

  if (user) {
    navigate('/min-side');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message || 'Kunne ikke logge ind');
        } else {
          toast.success('Du er nu logget ind!');
          navigate('/min-side');
        }
      } else {
        if (!firstName.trim()) {
          toast.error('Indtast venligst dit fornavn');
          setIsLoading(false);
          return;
        }
        if (!lastName.trim()) {
          toast.error('Indtast venligst dit efternavn');
          setIsLoading(false);
          return;
        }
        if (!phone.trim()) {
          toast.error('Indtast venligst dit telefonnummer');
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(email, password, firstName, lastName, phone);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Denne email er allerede registreret');
          } else {
            toast.error(error.message || 'Kunne ikke oprette bruger');
          }
        } else {
          toast.success('Velkommen! Du er nu medlem.');
          navigate('/min-side');
        }
      }
    } catch (err) {
      toast.error('Der opstod en fejl');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Indtast din email-adresse');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/min-side`,
      });
      if (error) {
        toast.error(error.message || 'Kunne ikke sende nulstillingslink');
      } else {
        toast.success('Vi har sendt dig et link til at nulstille din adgangskode. Tjek din indbakke.');
      }
    } catch (err) {
      toast.error('Der opstod en fejl');
    } finally {
      setIsLoading(false);
    }
  };

  if (isRecovery) {
    return (
      <Layout>
        <div className="container-narrow py-16 md:py-24">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="font-serif text-2xl">Nulstil adgangskode</CardTitle>
                <CardDescription>
                  Indtast din email, så sender vi et link til at nulstille din adgangskode
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRecovery} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recovery-email">Email</Label>
                    <Input
                      id="recovery-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="din@email.dk"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send nulstillingslink
                  </Button>
                </form>
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setIsRecovery(false)}
                    className="text-primary hover:underline text-sm inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Tilbage til login
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-narrow py-16 md:py-24">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-2xl">
                {isLogin ? 'Log ind' : 'Bliv medlem'}
              </CardTitle>
              <CardDescription>
                {isLogin
                  ? 'Log ind for at reservere produkter'
                  : 'Opret en konto og bliv en del af fællesskabet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Fulde navn</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Dit navn"
                        required={!isLogin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefonnummer</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="12 34 56 78"
                        required={!isLogin}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@email.dk"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Adgangskode</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => setIsRecovery(true)}
                        className="text-xs text-muted-foreground hover:text-primary hover:underline"
                      >
                        Glemt adgangskode?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? 'Log ind' : 'Opret konto'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline"
                >
                  {isLogin ? 'Har du ikke en konto? Opret en her' : 'Har du allerede en konto? Log ind'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
