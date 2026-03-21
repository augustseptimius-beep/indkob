import { useState, useMemo } from 'react';
import { useProducts, useCategories, useProductTags, useDeleteProduct } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Download, Search } from 'lucide-react';
import { ProductFormDialog } from './ProductFormDialog';
import { ProductImportDialog } from './ProductImportDialog';
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

export function AdminProducts() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { data: tags } = useProductTags();
  const deleteProduct = useDeleteProduct();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [importedData, setImportedData] = useState<{ data: ImportedProductData; sourceUrl: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.title.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'none' && p.category_id) return false;
        if (categoryFilter !== 'none' && p.category_id !== categoryFilter) return false;
      }
      return true;
    });
  }, [products, searchQuery, statusFilter, categoryFilter]);

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
    setImportedData(null);
  };

  const handleImport = (data: ImportedProductData, sourceUrl: string) => {
    setImportedData({ data, sourceUrl });
    setIsFormOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: 'bg-primary/20 text-primary',
      ordered: 'bg-accent/20 text-accent-foreground',
      arrived: 'bg-green-100 text-green-800',
    };
    const labels: Record<string, string> = {
      open: 'Åben',
      ordered: 'Bestilt',
      arrived: 'Ankommet',
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl font-semibold">
          Produkter ({filteredProducts.length}{filteredProducts.length !== (products?.length || 0) ? ` af ${products?.length}` : ''})
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Importer fra URL</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Button size="sm" onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Tilføj
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søg på produktnavn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Alle statusser" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statusser</SelectItem>
            <SelectItem value="open">Åben</SelectItem>
            <SelectItem value="ordered">Bestilt</SelectItem>
            <SelectItem value="arrived">Ankommet</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Alle kategorier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kategorier</SelectItem>
            <SelectItem value="none">Uden kategori</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex min-w-0 items-start gap-2 mb-1 flex-wrap">
                      <h3 className="min-w-0 flex-1 truncate font-semibold">{product.title}</h3>
                      <div className="shrink-0">
                        {getStatusBadge(product.status)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground break-words">
                      {product.current_quantity} / {product.target_quantity} {product.unit_name} • {product.price_per_unit} kr. pr. {product.unit_name}
                    </p>
                    {product.category && (
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        Kategori: {product.category.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 sm:gap-2 sm:flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                    onClick={() => handleEdit(product)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                    onClick={() => setDeletingProduct(product)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {products?.length === 0
                ? 'Ingen produkter endnu. Klik "Tilføj produkt" for at oprette det første.'
                : 'Ingen produkter matcher dine filtre.'}
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
        importedData={importedData?.data}
        importedSourceUrl={importedData?.sourceUrl}
      />

      <ProductImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={handleImport}
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
