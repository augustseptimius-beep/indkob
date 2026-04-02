import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  useWishlist,
  useCreateWishlistItem,
  useToggleVote,
  useAddComment,
  useWishlistComments,
  useToggleWishlistAdded,
  type WishlistItemWithMeta,
} from '@/hooks/useWishlist';
import { toast } from 'sonner';
import { Lightbulb, ChevronUp, MessageCircle, ExternalLink, Plus, Send, Check } from 'lucide-react';

function WishlistItemCard({ item, isAdmin }: { item: WishlistItemWithMeta; isAdmin: boolean }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const toggleVote = useToggleVote();
  const addComment = useAddComment();
  const toggleAdded = useToggleWishlistAdded();
  const { data: comments } = useWishlistComments(showComments ? item.id : null);

  const handleVote = () => {
    toggleVote.mutate({ wishlistItemId: item.id, hasVoted: item.user_has_voted });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await addComment.mutateAsync({ wishlistItemId: item.id, content: commentText.trim() });
      setCommentText('');
    } catch {
      toast.error('Kunne ikke tilføje kommentar');
    }
  };

  const handleToggleAdded = () => {
    toggleAdded.mutate({ id: item.id, is_added: !item.is_added });
  };

  return (
    <Card className={item.is_added ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Vote button */}
          <div className="flex flex-col items-center gap-0.5 pt-0.5">
            <Button
              variant={item.user_has_voted ? 'default' : 'outline'}
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={handleVote}
              disabled={toggleVote.isPending}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">{item.vote_count}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base">{item.title}</h3>
                {item.is_added && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Check className="h-3 w-3" />
                    Tilføjet
                  </Badge>
                )}
              </div>
              {item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary flex-shrink-0">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            {item.note && <p className="text-sm text-muted-foreground mt-1">{item.note}</p>}
            
            <p className="text-xs text-muted-foreground mt-1.5">
              Foreslået af <span className="font-medium">{item.creator_name ?? 'Anonym'}</span>
            </p>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-auto py-1 px-2 text-xs"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                {item.comment_count} {item.comment_count === 1 ? 'kommentar' : 'kommentarer'}
              </Button>

              {isAdmin && (
                <Button
                  variant={item.is_added ? 'outline' : 'secondary'}
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
                  onClick={handleToggleAdded}
                  disabled={toggleAdded.isPending}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {item.is_added ? 'Fjern markering' : 'Markér som tilføjet'}
                </Button>
              )}
            </div>

            {showComments && (
              <div className="mt-3 space-y-3">
                {comments?.map((c) => (
                  <div key={c.id} className="bg-muted/50 rounded-md p-3">
                    <p className="text-sm">{c.content}</p>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      {new Date(c.created_at).toLocaleDateString('da-DK')}
                    </span>
                  </div>
                ))}

                <form onSubmit={handleComment} className="flex gap-2">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Skriv en kommentar..."
                    className="text-sm"
                  />
                  <Button type="submit" size="icon" disabled={addComment.isPending || !commentText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WishlistPage() {
  const { user, isAdmin } = useAuth();
  const { data: items, isLoading } = useWishlist();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const createItem = useCreateWishlistItem();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createItem.mutateAsync({ title, link: link || undefined, note: note || undefined });
      setTitle('');
      setLink('');
      setNote('');
      setShowForm(false);
      toast.success('Ønske oprettet!');
    } catch {
      toast.error('Kunne ikke oprette ønske');
    }
  };

  // Split into active and added, sort each by votes
  const active = [...(items ?? [])].filter(i => !i.is_added).sort((a, b) => b.vote_count - a.vote_count);
  const added = [...(items ?? [])].filter(i => i.is_added).sort((a, b) => b.vote_count - a.vote_count);

  return (
    <Layout>
      <div className="container-narrow py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Lightbulb className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">Ønskeliste</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Foreslå produkter, stem på andres forslag og kommenter med leverandøridéer.
          </p>
        </div>

        {!user ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">Log ind for at se og interagere med ønskelisten.</p>
              <Button onClick={() => (window.location.href = '/auth')}>Log ind</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {!showForm ? (
              <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" /> Foreslå et produkt
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Nyt produktønske</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="title">Produktnavn *</Label>
                      <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="F.eks. Økologiske valnødder" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="link">Link (valgfrit)</Label>
                      <Input id="link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="note">Bemærkning (valgfrit)</Label>
                      <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hvorfor dette produkt?" rows={2} />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={createItem.isPending}>
                        {createItem.isPending ? 'Sender...' : 'Opret ønske'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Annuller</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Indlæser...</p>
            ) : active.length === 0 && added.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Ingen ønsker endnu — vær den første!</p>
            ) : (
              <>
                {active.map((item) => <WishlistItemCard key={item.id} item={item} isAdmin={!!isAdmin} />)}

                {added.length > 0 && (
                  <div className="space-y-3 pt-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      ✅ Tilføjet til sortimentet
                    </h3>
                    {added.map((item) => <WishlistItemCard key={item.id} item={item} isAdmin={!!isAdmin} />)}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
