import { useState } from 'react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMemo } from 'react';

export function AdminCategories() {
  const { data: categories, isLoading } = useCategories();
  const { data: products } = useProducts();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Count products per category
  const productCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    products?.forEach(p => {
      if (p.category_id) {
        map[p.category_id] = (map[p.category_id] || 0) + 1;
      }
    });
    return map;
  }, [products]);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await createCategory.mutateAsync(trimmed);
      setNewName('');
      toast({ title: 'Kategori oprettet' });
    } catch {
      toast({ title: 'Fejl', description: 'Kunne ikke oprette kategori', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !editingName.trim()) return;
    try {
      await updateCategory.mutateAsync({ id: editingId, name: editingName.trim() });
      setEditingId(null);
      toast({ title: 'Kategori opdateret' });
    } catch {
      toast({ title: 'Fejl', description: 'Kunne ikke opdatere kategori', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteCategory.mutateAsync(deletingId);
      setDeletingId(null);
      toast({ title: 'Kategori slettet' });
    } catch {
      toast({ title: 'Fejl', description: 'Kunne ikke slette kategori. Den er muligvis i brug.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Indlæser kategorier...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Kategorier ({categories?.length || 0})</h2>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ny kategori..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <Button onClick={handleCreate} disabled={!newName.trim() || createCategory.isPending} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Tilføj
        </Button>
      </div>

      <div className="grid gap-3">
        {categories?.map((cat) => {
          const count = productCountMap[cat.id] || 0;
          return (
            <Card key={cat.id} className={count === 0 ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-center gap-3">
                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                      className="flex-1"
                      autoFocus
                    />
                    <Button variant="outline" size="icon" onClick={handleUpdate} disabled={updateCategory.isPending}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{cat.name}</span>
                    <Badge variant={count > 0 ? 'secondary' : 'outline'} className="text-xs">
                      {count} produkt{count !== 1 ? 'er' : ''}
                    </Badge>
                    <Button variant="outline" size="icon" onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setDeletingId(cat.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}

        {categories?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Ingen kategorier endnu.
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingId && productCountMap[deletingId] > 0
                ? `Denne kategori har ${productCountMap[deletingId]} tilknyttede produkter. Fjern kategorien fra produkterne først.`
                : 'Hvis kategorien er knyttet til produkter, kan sletning fejle. Fjern kategorien fra produkterne først.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
