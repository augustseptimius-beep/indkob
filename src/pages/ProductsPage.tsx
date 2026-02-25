import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { CategoryFilter } from '@/components/products/CategoryFilter';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

type SortOption = 'newest' | 'savings' | 'closest';

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showArrived, setShowArrived] = useState(false);
  const { data: products, isLoading } = useProducts(selectedCategory || undefined);
  const { data: categories } = useCategories();

  const filteredAndSortedProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products;

    // Filter by status - hide arrived by default (products are always 'open' now)
    if (!showArrived) {
      filtered = filtered.filter(p => p.status === 'open');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.supplier_name?.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case 'savings':
        filtered = [...filtered].sort((a, b) => {
          const savingsA = a.comparison_price ? (1 - a.price_per_unit / a.comparison_price) : 0;
          const savingsB = b.comparison_price ? (1 - b.price_per_unit / b.comparison_price) : 0;
          return savingsB - savingsA;
        });
        break;
      case 'closest':
        filtered = [...filtered].sort((a, b) => {
          const progressA = a.current_quantity / a.target_quantity;
          const progressB = b.current_quantity / b.target_quantity;
          return progressB - progressA;
        });
        break;
      case 'newest':
      default:
        // Already sorted by created_at desc from the query
        break;
    }

    return filtered;
  }, [products, searchQuery, sortBy, showArrived]);

  return (
    <Layout>
      <div className="container-wide py-12">
        <div className="mb-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">Produkter</h1>
          <p className="text-muted-foreground mb-6">
            Se alle aktive indkøb og tilmeld dig de produkter, du gerne vil have
          </p>

          {/* Search and sort */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søg efter produkt, leverandør..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Sorter efter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Nyeste først</SelectItem>
                <SelectItem value="savings">Største besparelse</SelectItem>
                <SelectItem value="closest">Tættest på mål</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            {categories && products && (
              <CategoryFilter
                categories={categories.filter(cat => products.some(p => p.category_id === cat.id))}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="show-arrived"
                checked={showArrived}
                onCheckedChange={setShowArrived}
              />
              <Label htmlFor="show-arrived" className="text-sm text-muted-foreground cursor-pointer">
                Vis ankomne
              </Label>
            </div>
          </div>
        </div>
        <ProductGrid products={filteredAndSortedProducts} isLoading={isLoading} />
      </div>
    </Layout>
  );
}
