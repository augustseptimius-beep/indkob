import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/products/ProductGrid';
import { useProducts } from '@/hooks/useProducts';
import { ArrowRight } from 'lucide-react';

export function FeaturedProductsSection() {
  const { data: products, isLoading } = useProducts();

  // Show only open products, limited to 4
  const featuredProducts = products
    ?.filter((p) => p.status === 'open')
    .slice(0, 4) || [];

  if (featuredProducts.length === 0 && !isLoading) {
    return null;
  }

  return (
    <section className="py-20">
      <div className="container-wide">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              Aktuelle indkøb
            </h2>
            <p className="text-muted-foreground">
              Se hvilke produkter der er åbne for tilmelding lige nu
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/produkter">
              Se alle
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        <ProductGrid products={featuredProducts} isLoading={isLoading} />
      </div>
    </section>
  );
}
