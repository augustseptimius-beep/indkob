import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, User, LogOut, ShoppingBag, Settings, X } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="container-wide">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-serif font-bold text-lg">K</span>
            </div>
            <span className="hidden sm:block font-serif text-xl font-semibold text-foreground">
              Klitmøller
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/produkter"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Produkter
            </Link>
            <Link
              to="/oenskeliste"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Ønskeliste
            </Link>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/min-side')}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Min side
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log ud
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate('/auth')} variant="default">
                Log ind
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link
                to="/produkter"
                className="text-foreground font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Produkter
              </Link>
              <Link
                to="/oenskeliste"
                className="text-foreground font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Ønskeliste
              </Link>
              {user ? (
                <>
                  <Link
                    to="/min-side"
                    className="text-foreground font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Min side
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="text-foreground font-medium py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="text-left text-destructive font-medium py-2"
                  >
                    Log ud
                  </button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    navigate('/auth');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Log ind
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
