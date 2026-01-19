import { useState } from 'react';
import { useProducts, useCategories, useProductTags, useDeleteProduct } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { ProductFormDialog } from './ProductFormDialog';
import { Badge } from '@/components/ui/badge';
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
import type { Product } from '@/lib/supabase-types';

export function AdminProducts() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { data: tags } = useProductTags();
  const deleteProduct = useDeleteProduct();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingProduct) {
      await deleteProduct.mutateAsync(deletingProduct.id);
      setDeletingProduct(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: 'bg-primary/20 text-primary',
      ordered: 'bg-accent/20 text-accent-foreground',
      arrived: 'bg-green-100 text-green-800',
      completed: 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = {
      open: 'Åben',
      ordered: 'Bestilt',
      arrived: 'Ankommet',
      completed: 'Afsluttet',
    };
    return (
      <Badge className={variants[status] || variants.open}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Indlæser produkter...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Produkter ({products?.length || 0})</h2>
        <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Tilføj produkt
        </Button>
      </div>

      <div className="grid gap-4">
        {products?.map((product) => (
          <Card key={product.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{product.title}</h3>
                    {getStatusBadge(product.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product.current_quantity} / {product.target_quantity} {product.unit_name} • 
                    {product.price_per_unit} kr. pr. {product.unit_name}
                  </p>
                  {product.category && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Kategori: {product.category.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(product)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDeletingProduct(product)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {products?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Ingen produkter endnu. Klik "Tilføj produkt" for at oprette det første.
            </CardContent>
          </Card>
        )}
      </div>

      <ProductFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        product={editingProduct}
        categories={categories || []}
        tags={tags || []}
      />

      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil permanent slette produktet "{deletingProduct?.title}". 
              Denne handling kan ikke fortrydes.
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
