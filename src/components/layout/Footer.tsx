import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container-wide py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-serif font-bold text-lg">K</span>
              </div>
              <span className="font-serif text-xl font-semibold">Klitmøller</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              En lokal indkøbsforening hvor fællesskab og bæredygtighed går hånd i hånd.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-serif font-semibold mb-4">Navigation</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/produkter" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Produkter
              </Link>
              <Link to="/oenskeliste" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Ønskeliste
              </Link>
              <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Log ind / Bliv medlem
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif font-semibold mb-4">Kontakt</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Klitmøllers Indkøbsforening<br />
              Klitmøller, Danmark
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} Klitmøllers Indkøbsforening. Alle rettigheder forbeholdes.
        </div>
      </div>
    </footer>
  );
}
