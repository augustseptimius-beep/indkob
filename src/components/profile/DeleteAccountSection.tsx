import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';

interface DeleteAccountSectionProps {
  hasUnpaidReservations: boolean;
  unpaidCount: number;
}

export function DeleteAccountSection({ hasUnpaidReservations, unpaidCount }: DeleteAccountSectionProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || confirmText !== 'SLET MIN KONTO') {
      toast.error('Du skal skrive "SLET MIN KONTO" for at bekræfte');
      return;
    }

    setIsDeleting(true);
    try {
      // Delete user's reservations first
      const { error: reservationsError } = await supabase
        .from('reservations')
        .delete()
        .eq('user_id', user.id);

      if (reservationsError) {
        console.error('Error deleting reservations:', reservationsError);
      }

      // Delete user's wishlist items
      const { error: wishlistError } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id);

      if (wishlistError) {
        console.error('Error deleting wishlist:', wishlistError);
      }

      // Delete user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
      }

      // Delete user's roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error deleting roles:', rolesError);
      }

      // Sign out the user (the auth.users record can only be deleted by service role)
      await signOut();
      
      toast.success('Din konto er blevet slettet', {
        description: 'Alle dine data er blevet fjernet fra systemet.',
      });
      
      navigate('/');
    } catch (error: any) {
      toast.error('Kunne ikke slette kontoen', { description: error.message });
    } finally {
      setIsDeleting(false);
      setDialogOpen(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Slet konto
        </CardTitle>
        <CardDescription>
          Slet din konto og alle tilknyttede data permanent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasUnpaidReservations ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Du kan ikke slette din konto
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Du har {unpaidCount} {unpaidCount === 1 ? 'reservation' : 'reservationer'} med udestående betaling. 
                Kontakt en administrator for at få markeret dine betalinger, før du kan slette din konto.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Når du sletter din konto, fjernes alle dine data permanent, herunder:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Din profil og personlige oplysninger</li>
              <li>Alle dine reservationer</li>
              <li>Din ønskeliste</li>
            </ul>
            <p className="text-sm font-medium text-destructive">
              Denne handling kan ikke fortrydes.
            </p>
            
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-4">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Slet min konto
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Er du helt sikker?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      Dette vil permanent slette din konto og alle dine data. 
                      Denne handling kan ikke fortrydes.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="confirm">
                        Skriv <strong>SLET MIN KONTO</strong> for at bekræfte
                      </Label>
                      <Input
                        id="confirm"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="SLET MIN KONTO"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText('')}>Annuller</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={confirmText !== 'SLET MIN KONTO' || isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Slet permanent
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
