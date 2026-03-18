import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const CONSENT_VERSION = 1;
const CONSENT_TEXT = 'Jeg accepterer at blive medlem af den kommende forening Klitmøllers Indkøbsfællesskab. Medlemskab er gratis i beta-perioden, men vil fremadrettet koste et mindre årligt kontingent som dækker platformens drift.';

export function ConsentModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!user || hasChecked) return;

    const checkConsent = async () => {
      // Skip check if user was created in the last 30 seconds (signup just happened, consent already stored inline)
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      if (Date.now() - createdAt < 30000) {
        setHasChecked(true);
        return;
      }

      const { data, error } = await supabase
        .from('membership_consents')
        .select('id')
        .eq('user_id', user.id)
        .gte('consent_version', CONSENT_VERSION)
        .maybeSingle();

      if (error) {
        console.error('Error checking consent:', error);
        return;
      }

      setHasChecked(true);
      if (!data) {
        setOpen(true);
      }
    };

    checkConsent();
  }, [user, hasChecked]);

  const handleAccept = async () => {
    if (!user || !checked) return;
    setIsLoading(true);

    const { error } = await supabase.from('membership_consents').insert({
      user_id: user.id,
      consent_text: CONSENT_TEXT,
      consent_version: CONSENT_VERSION,
    });

    if (error) {
      console.error('CRITICAL: Retroactive consent insert failed for user', user.id, error);
      toast.error('Kunne ikke gemme din accept. Prøv igen.');
    } else {
      toast.success('Tak! Din accept er registreret.');
      setOpen(false);
    }

    setIsLoading(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Acceptér medlemsbetingelser</DialogTitle>
          <DialogDescription>
            For at fortsætte med at bruge platformen skal du acceptere betingelserne for medlemskab af den kommende forening.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4 my-2">
          <Checkbox
            id="retroactive-consent"
            checked={checked}
            onCheckedChange={(val) => setChecked(val === true)}
            className="mt-0.5"
          />
          <label
            htmlFor="retroactive-consent"
            className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
          >
            {CONSENT_TEXT}
          </label>
        </div>

        <DialogFooter>
          <Button onClick={handleAccept} disabled={!checked || isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Acceptér og fortsæt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
