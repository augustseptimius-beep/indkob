import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { Menu, User, LogOut, ShoppingBag, Settings, X, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useMyReservations } from '@/hooks/useReservations';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: reservations } = useMyReservations();
  const { itemCount, setIsOpen: openCart } = useCart();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Count active reservations (not completed)
  const activeReservations = reservations?.filter((r) => r.status !== 'completed') || [];
  const reservationCount = activeReservations.length;

  // Check if any reservations need payment (ordered or ready, unpaid)
  const unpaidActive = activeReservations.filter((r) => (r.status === 'ordered' || r.status === 'ready') && !r.paid);
  const hasPendingPayment = unpaidActive.length > 0;

  // Check if any reservations are paid but not yet picked up
  const awaitingPickup = activeReservations.filter((r) => r.paid && r.status !== 'completed');
  const hasAwaitingPickup = awaitingPickup.length > 0;

  return (
    <div className="sticky top-0 z-50">
      {/* Beta Banner */}
      <div className="bg-accent text-accent-foreground text-center py-1.5 text-xs font-medium">
        🚧 Beta-version — Gratis i testperioden. Ved 25+ medlemmer afholdes stiftende generalforsamling.
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
                className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                
              Produkter
            </Link>
            <Link
                to="/oenskeliste"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                
              Ønskeliste
            </Link>
            <Link
                to="/om"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                
              Om os
            </Link>
            {user ?
              <>
                {/* Cart button */}
                <button
                  onClick={() => openCart(true)}
                  className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
                  title="Åbn kurv"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs">
                      {itemCount}
                    </Badge>
                  )}
                </button>

                {/* Min side */}
                <Link
                  to="/min-side"
                  className="relative flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium">
                  <span>Min side</span>
                  {reservationCount > 0 &&
                  <Badge
                    variant={hasPendingPayment ? "destructive" : "default"}
                    className={`absolute -top-2 -right-4 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs ${
                    hasPendingPayment ? 'animate-pulse' : ''}`
                    }>
                      {hasPendingPayment && <AlertCircle className="h-3 w-3 mr-0.5" />}
                      {reservationCount}
                    </Badge>
                  }
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isAdmin &&
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Admin
                      </DropdownMenuItem>
                    }
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log ud
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </> :

              <Button onClick={() => navigate('/auth')} variant="default">
                Log ind
              </Button>
              }
          </nav>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            {/* Cart icon on mobile */}
            <button
              onClick={() => openCart(true)}
              className="relative p-2"
              title="Åbn kurv"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs">
                  {itemCount}
                </Badge>
              )}
            </button>
            <button
                className="p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen &&
          <div className="lg:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link
                to="/produkter"
                className="text-foreground font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}>
                
                Produkter
              </Link>
              <Link
                to="/oenskeliste"
                className="text-foreground font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}>
                
                Ønskeliste
              </Link>
              <Link
                to="/om"
                className="text-foreground font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}>
                
                Om os
              </Link>
              {user ?
              <>
                  <Link
                  to="/min-side"
                  className="flex items-center gap-2 text-foreground font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}>
                  
                    <ShoppingBag className="h-5 w-5" />
                    Min side
                    {reservationCount > 0 &&
                  <Badge
                    variant={hasPendingPayment ? "destructive" : hasAwaitingPickup ? "default" : "default"}
                    className={hasPendingPayment ? 'animate-pulse' : ''}>
                    
                        {hasPendingPayment && <AlertCircle className="h-3 w-3 mr-1" />}
                        {reservationCount} {hasPendingPayment ? '- Afventer betaling' : hasAwaitingPickup ? '- Mangler afhentning' : ''}
                      </Badge>
                  }
                  </Link>
                  {isAdmin &&
                <Link
                  to="/admin"
                  className="text-foreground font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}>
                  
                      Admin
                    </Link>
                }
                  <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-destructive font-medium py-2">
                  
                    Log ud
                  </button>
                </> :

              <Button
                onClick={() => {
                  navigate('/auth');
                  setMobileMenuOpen(false);
                }}
                className="w-full">
                
                  Log ind
                </Button>
              }
            </nav>
          </div>
          }
      </div>
    </header>
    </div>);

}