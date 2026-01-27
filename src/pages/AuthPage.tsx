import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? false : true;
  const [isLogin, setIsLogin] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Update mode when URL changes
  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsLogin(mode !== 'signup');
  }, [searchParams]);

  // Redirect if already logged in
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
        if (!fullName.trim()) {
          toast.error('Indtast venligst dit navn');
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName);
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
                  <Label htmlFor="password">Adgangskode</Label>
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
