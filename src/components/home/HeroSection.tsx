import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Package, Landmark } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function HeroSection() {
  const { data: memberCount } = useQuery({
    queryKey: ['member-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  return <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/20" />
      
      <div className="container-wide relative py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge with member count */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-4 py-2 rounded-2xl sm:rounded-full bg-primary/10 text-primary mb-8 animate-fade-in">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">Lokalt fællesskab</span>
            </div>
            {memberCount !== undefined && memberCount > 0 && (
              <>
                <span className="hidden sm:block w-px h-4 bg-primary/30" />
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-semibold">{memberCount} medlemmer</span>
                </div>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-slide-up">
            Klitmøllers Indkøbsfællesskab
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-4 animate-slide-up delay-100">
            Fællesskab gennem fælles indkøb
          </p>

          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up delay-200">
            Vi er et lokalt indkøbsfællesskab, hvor beboere går sammen om at købe store partier af kvalitetsvarer til favorable priser. Platformen er gratis i beta-perioden — driftsudgifter dækkes af initiativtager August.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up delay-300">
            <Button asChild size="lg" className="gap-2">
              <Link to="/produkter">
                Se produkter
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth?mode=signup">Bliv medlem — det er gratis</Link>
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <div className="bg-card rounded-2xl p-6 text-center shadow-sm animate-slide-up delay-100">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-serif text-lg font-semibold mb-2">Store partier</h3>
            <p className="text-muted-foreground text-sm">
              Køb kvalitetsvarer i store mængder til bedre priser
            </p>
          </div>
          <div className="bg-card rounded-2xl p-6 text-center shadow-sm animate-slide-up delay-200">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-serif text-lg font-semibold mb-2">Del omkostningerne</h3>
            <p className="text-muted-foreground text-sm">
              Gå sammen med naboer og venner om indkøb
            </p>
          </div>
          <div className="bg-card rounded-2xl p-6 text-center shadow-sm animate-slide-up delay-300">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Landmark className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-serif text-lg font-semibold mb-2">På vej mod forening</h3>
            <p className="text-muted-foreground text-sm">
              Ved 25+ medlemmer stiftes en forening. Gratis i beta-perioden.
            </p>
          </div>
        </div>
      </div>
    </section>;
}