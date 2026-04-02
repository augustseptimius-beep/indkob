import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

const CONSENT_VERSION = 1;
const CONSENT_TEXT = 'Jeg accepterer at blive medlem af den kommende forening Klitmøllers Indkøbsfællesskab. Medlemskab er gratis i beta-perioden, men vil fremadrettet koste et mindre årligt kontingent som dækker platformens drift.';

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
  const [acceptConsent, setAcceptConsent] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
        const { error } = await signIn(email, password, rememberMe);
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
        if (!acceptConsent) {
          toast.error('Du skal acceptere betingelserne for at oprette en konto');
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
          // Store consent in database — non-blocking, but log errors
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { error: consentError } = await supabase.from('membership_consents').insert({
              user_id: session.user.id,
              consent_text: CONSENT_TEXT,
              consent_version: CONSENT_VERSION,
            });
            if (consentError) {
              console.error('CRITICAL: Consent insert failed for user', session.user.id, consentError);
            }
          } else {
            console.error('CRITICAL: No session after signup — consent not stored for email:', email);
          }
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
        redirectTo: `${window.location.origin}/nulstil-adgangskode`,
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
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Fornavn</Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Fornavn"
                          required={!isLogin}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Efternavn</Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Efternavn"
                          required={!isLogin}
                        />
                      </div>
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

                {/* Remember me - only shown on login */}
                {isLogin && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-sm text-muted-foreground cursor-pointer select-none"
                    >
                      Husk mig
                    </label>
                  </div>
                )}

                {/* Consent checkbox - only shown on signup */}
                {!isLogin && (
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
                    <Checkbox
                      id="consent"
                      checked={acceptConsent}
                      onCheckedChange={(checked) => setAcceptConsent(checked === true)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor="consent"
                      className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                    >
                      {CONSENT_TEXT}
                    </label>
                  </div>
                )}

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