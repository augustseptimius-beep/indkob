import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Send, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AdminBroadcastEmail() {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const availableVariables = [
    { key: '{{user_name}}', desc: 'Brugerens navn' },
  ];

  const canSend = subject.trim() && bodyHtml.trim();

  const handleSend = async () => {
    if (!canSend) return;
    setIsSending(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Du skal være logget ind');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-broadcast-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subject, body_html: bodyHtml }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({ sent: data.sent, failed: data.failed, total: data.total });
        toast.success(`Email sendt til ${data.sent} af ${data.total} brugere`);
        if (data.failed > 0) {
          toast.warning(`${data.failed} emails fejlede`);
        }
      } else {
        toast.error(data.error || 'Kunne ikke sende emails');
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      toast.error('Der opstod en netværksfejl');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send email til alle brugere</CardTitle>
          <CardDescription>
            Skriv en email der sendes til alle registrerede brugere. Der er 2 sekunders forsinkelse mellem hver afsendelse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="broadcast-subject">Emne</Label>
            <Input
              id="broadcast-subject"
              placeholder="Emne for emailen..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
            />
          </div>

          <div className="space-y-2">
            <Label>Indhold</Label>
            <RichTextEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Skriv din email her..."
              availableVariables={availableVariables}
            />
          </div>

          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
              result.failed > 0 
                ? 'bg-warning/10 text-warning-foreground' 
                : 'bg-primary/10 text-primary'
            }`}>
              {result.failed > 0 ? (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 shrink-0" />
              )}
              <span>
                Sendt til {result.sent} af {result.total} brugere
                {result.failed > 0 && ` (${result.failed} fejlede)`}
              </span>
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!canSend || isSending} className="w-full sm:w-auto">
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sender emails...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send til alle brugere
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send email til alle brugere?</AlertDialogTitle>
                <AlertDialogDescription>
                  Denne email vil blive sendt til alle registrerede brugere. Handlingen kan ikke fortrydes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuller</AlertDialogCancel>
                <AlertDialogAction onClick={handleSend}>
                  Send emails
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
