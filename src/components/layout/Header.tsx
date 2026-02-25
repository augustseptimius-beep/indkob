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
import { Menu, User, LogOut, ShoppingBag, Settings, X, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useMyReservations } from '@/hooks/useReservations';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: reservations } = useMyReservations();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Count active reservations (not completed)
  const activeReservations = reservations?.filter(r => r.status !== 'completed') || [];
  const reservationCount = activeReservations.length;
  
  // Check if any reservations need payment (ordered or ready status)
  const hasPendingPayment = activeReservations.some(r => r.status === 'ordered' || r.status === 'ready');

  return (
    <div className="sticky top-0 z-50">
      {/* Beta Banner */}
      <div className="bg-accent text-accent-foreground text-center py-1.5 text-xs font-medium">
        🚧 Beta-version — Denne platform er under udvikling og kun til test
      </div>
      <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="container-wide">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 min-w-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-serif font-bold text-sm">KIF</span>
            </div>
            <span className="hidden sm:block font-serif text-xl font-semibold text-foreground">
              Klitmøllers Indkøbsfællesskab
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 uppercase tracking-wider border-accent text-accent font-semibold">
              Beta
            </Badge>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
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
            <Link
              to="/om"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Om os
            </Link>
            {user ? (
              <>
                {/* Min side with badge */}
                <Link
                  to="/min-side"
                  className="relative flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
                >
                  <ShoppingBag className="h-5 w-5" />
                  <span>Min side</span>
                  {reservationCount > 0 && (
                    <Badge 
                      variant={hasPendingPayment ? "destructive" : "default"}
                      className={`absolute -top-2 -right-4 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs ${
                        hasPendingPayment ? 'animate-pulse' : ''
                      }`}
                    >
                      {hasPendingPayment && <AlertCircle className="h-3 w-3 mr-0.5" />}
                      {reservationCount}
                    </Badge>
                  )}
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
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
              </>
            ) : (
              <Button onClick={() => navigate('/auth')} variant="default">
                Log ind
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            {user && reservationCount > 0 && (
              <Link to="/min-side" className="relative p-2">
                <ShoppingBag className="h-5 w-5" />
                <Badge 
                  variant={hasPendingPayment ? "destructive" : "default"}
                  className={`absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs ${
                    hasPendingPayment ? 'animate-pulse' : ''
                  }`}
                >
                  {reservationCount}
                </Badge>
              </Link>
            )}
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-fade-in">
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
              <Link
                to="/om"
                className="text-foreground font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Om os
              </Link>
              {user ? (
                <>
                  <Link
                    to="/min-side"
                    className="flex items-center gap-2 text-foreground font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Min side
                    {reservationCount > 0 && (
                      <Badge 
                        variant={hasPendingPayment ? "destructive" : "default"}
                        className={hasPendingPayment ? 'animate-pulse' : ''}
                      >
                        {hasPendingPayment && <AlertCircle className="h-3 w-3 mr-1" />}
                        {reservationCount} {hasPendingPayment ? '- Afventer betaling' : ''}
                      </Badge>
                    )}
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
    </div>
  );
}
