import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/supabase-types';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedCategory === null ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelectCategory(null)}
      >
        Alle
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelectCategory(category.id)}
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
}
