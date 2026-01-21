import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';

const COOKIE_INFO_DISMISSED_KEY = 'cookie-info-dismissed';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(COOKIE_INFO_DISMISSED_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const dismissBanner = () => {
    localStorage.setItem(COOKIE_INFO_DISMISSED_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card border-t border-border shadow-lg">
      <div className="container-wide">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Info className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-foreground font-medium">
                Information om cookies
              </p>
              <p className="text-sm text-muted-foreground">
                Denne hjemmeside bruger kun nødvendige cookies til autentificering og grundlæggende funktionalitet. 
                Vi bruger ingen tracking- eller markedsføringscookies.{' '}
                <Link to="/privatlivspolitik" className="text-primary hover:underline">
                  Læs mere i vores privatlivspolitik
                </Link>.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={dismissBanner} className="flex-shrink-0">
            <X className="h-4 w-4 mr-2" />
            Luk
          </Button>
        </div>
      </div>
    </div>
  );
}
