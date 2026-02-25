import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, ArrowRight } from 'lucide-react';

export function SignupBanner() {
  const { user } = useAuth();

  // Don't show if user is already logged in
  if (user) return null;

  return (
    <section className="py-16 bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10">
      <div className="container-wide">
        <Card className="border-primary/20 bg-card/80 backdrop-blur">
          <CardContent className="py-8 md:py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="font-serif text-2xl md:text-3xl font-bold mb-2">
                  Bliv medlem af fællesskabet
                </h2>
                <p className="text-muted-foreground max-w-lg">
                  Opret en gratis konto og få adgang til at reservere varer, 
                  følge med i dine ordrer og blive en del af Klitmøllers Indkøbsfællesskab.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/auth?mode=signup">
                    <UserPlus className="h-4 w-4" />
                    Opret konto
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link to="/auth">
                    Log ind
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
