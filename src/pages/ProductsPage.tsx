import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { CategoryFilter } from '@/components/products/CategoryFilter';
import { useProducts, useCategories } from '@/hooks/useProducts';

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: products, isLoading } = useProducts(selectedCategory || undefined);
  const { data: categories } = useCategories();

  return (
    <Layout>
      <div className="container-wide py-12">
        <div className="mb-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">Produkter</h1>
          <p className="text-muted-foreground mb-6">
            Se alle aktive indkøb og tilmeld dig de produkter, du gerne vil have
          </p>
          {categories && (
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          )}
        </div>
        <ProductGrid products={products || []} isLoading={isLoading} />
      </div>
    </Layout>
  );
}
