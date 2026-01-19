import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateWishlistItem } from '@/hooks/useWishlist';
import { toast } from 'sonner';
import { Lightbulb, CheckCircle } from 'lucide-react';

export default function WishlistPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const createItem = useCreateWishlistItem();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Du skal være logget ind');
      return;
    }
    try {
      await createItem.mutateAsync({ title, link, note });
      setSubmitted(true);
      setTitle('');
      setLink('');
      setNote('');
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      toast.error('Kunne ikke indsende ønske');
    }
  };

  return (
    <Layout>
      <div className="container-narrow py-12">
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Lightbulb className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">Ønskeliste</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Har du et produkt, du gerne vil have med i foreningen? Send os et ønske, så kigger vi på det!
          </p>
        </div>

        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Indsend produktønske</CardTitle>
            <CardDescription>Fortæl os hvad du gerne vil se i vores sortiment</CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold mb-2">Tak for dit ønske!</h3>
                <p className="text-muted-foreground">Vi kigger på det hurtigst muligt.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Produktnavn *</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="F.eks. Økologiske valnødder" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link">Link til produkt (valgfrit)</Label>
                  <Input id="link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Bemærkninger (valgfrit)</Label>
                  <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fortæl os mere om dit ønske..." rows={3} />
                </div>
                {user ? (
                  <Button type="submit" className="w-full" disabled={createItem.isPending}>
                    {createItem.isPending ? 'Sender...' : 'Indsend ønske'}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="w-full" onClick={() => window.location.href = '/auth'}>
                    Log ind for at indsende
                  </Button>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
