import { useState } from 'react';
import { Loader2, Link2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ImportedProductData {
  title: string;
  description: string;
  price: number | null;
  image_url: string | null;
  origin_country: string | null;
  supplier_name: string | null;
  unit_name: string;
  is_organic: boolean;
}

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ImportedProductData, sourceUrl: string) => void;
}

export function ProductImportDialog({
  open,
  onOpenChange,
  onImport,
}: ProductImportDialogProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scraping' | 'analyzing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!url.trim()) {
      toast({
        title: 'Fejl',
        description: 'Indtast venligst en URL',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus('scraping');

    try {
      // Simulate a small delay to show the scraping status
      await new Promise(resolve => setTimeout(resolve, 500));
      setStatus('analyzing');

      const { data, error: invokeError } = await supabase.functions.invoke('scrape-product', {
        body: { url: url.trim() },
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Kunne ikke importere produkt');
      }

      if (!data.success) {
        throw new Error(data.error || 'Import fejlede');
      }

      setStatus('success');
      
      toast({
        title: 'Produkt importeret!',
        description: `"${data.data.title}" er klar til redigering`,
      });

      // Wait a moment to show success state
      await new Promise(resolve => setTimeout(resolve, 800));

      onImport(data.data, data.source_url);
      handleClose();

    } catch (err) {
      console.error('Import error:', err);
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Ukendt fejl';
      setError(errorMessage);
      toast({
        title: 'Import fejlede',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setStatus('idle');
    setError(null);
    onOpenChange(false);
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'scraping':
        return 'Henter produktside...';
      case 'analyzing':
        return 'Analyserer med AI...';
      case 'success':
        return 'Import gennemført!';
      case 'error':
        return 'Import fejlede';
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'scraping':
      case 'analyzing':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importer produkt fra URL
          </DialogTitle>
          <DialogDescription>
            Indsæt et link til en produktside, og AI vil automatisk udtrække titel, pris, beskrivelse og billede.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="product-url">Produkt URL</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="product-url"
                  placeholder="https://webshop.dk/produkt/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-9"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleImport();
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {status !== 'idle' && (
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              status === 'error' 
                ? 'bg-destructive/10 text-destructive' 
                : status === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-muted'
            }`}>
              {getStatusIcon()}
              <div className="flex-1">
                <p className="text-sm font-medium">{getStatusMessage()}</p>
                {error && <p className="text-xs mt-1">{error}</p>}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Tip:</strong> Virker bedst med produktsider fra danske webshops</p>
            <p>• Urtekram, Biogan, Helsam, osv.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Annuller
          </Button>
          <Button onClick={handleImport} disabled={isLoading || !url.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importerer...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Importer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
