import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { Product, Category, ProductTag } from '@/lib/supabase-types';
import { Upload, Loader2, X, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const productSchema = z.object({
  title: z.string().min(1, 'Titel er påkrævet'),
  description: z.string().optional(),
  image_url: z.string().url('Ugyldig URL').optional().or(z.literal('')),
  supplier_url: z.string().url('Ugyldig URL').optional().or(z.literal('')),
  origin_country: z.string().optional(),
  category_id: z.string().optional(),
  price_per_unit: z.coerce.number().positive('Pris skal være positiv'),
  comparison_price: z.coerce.number().positive('Pris skal være positiv').optional().or(z.literal('')),
  comparison_source: z.string().optional(),
  unit_name: z.string().min(1, 'Enhed er påkrævet'),
  target_quantity: z.coerce.number().int().positive('Mål-mængde skal være positiv'),
  minimum_purchase: z.coerce.number().int().positive('Minimum køb skal være positiv'),
  supplier_name: z.string().optional(),
  status: z.enum(['open', 'ordered']),
  is_organic: z.boolean(),
  notify_threshold: z.coerce.number().int().min(0, 'Skal være 0 eller højere'),
});

type ProductFormValues = z.infer<typeof productSchema>;

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

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  tags: ProductTag[];
  importedData?: ImportedProductData;
  importedSourceUrl?: string;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  importedData,
  importedSourceUrl,
}: ProductFormDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      image_url: '',
      supplier_url: '',
      origin_country: '',
      category_id: '',
      price_per_unit: 0,
      comparison_price: '',
      comparison_source: '',
      unit_name: 'stk',
      target_quantity: 10,
      minimum_purchase: 1,
      supplier_name: '',
      status: 'open',
      is_organic: false,
      notify_threshold: 2,
    },
  });

  useEffect(() => {
    if (product) {
      setPreviewUrl(product.image_url || null);
      setSupplierOpen(!!product.supplier_name || !!product.origin_country || !!product.supplier_url);
      setSettingsOpen(false);
      form.reset({
        title: product.title,
        description: product.description || '',
        image_url: product.image_url || '',
        supplier_url: product.supplier_url || '',
        origin_country: product.origin_country || '',
        category_id: product.category_id || '',
        price_per_unit: product.price_per_unit,
        comparison_price: product.comparison_price || '',
        comparison_source: product.comparison_source || '',
        unit_name: product.unit_name,
        target_quantity: product.target_quantity,
        minimum_purchase: product.minimum_purchase,
        supplier_name: product.supplier_name || '',
        status: product.status,
        is_organic: product.is_organic || false,
        notify_threshold: product.notify_threshold ?? 2,
      });
    } else if (importedData) {
      setPreviewUrl(importedData.image_url || null);
      setSupplierOpen(!!importedData.supplier_name || !!importedData.origin_country);
      setSettingsOpen(false);
      form.reset({
        title: importedData.title || '',
        description: importedData.description || '',
        image_url: importedData.image_url || '',
        supplier_url: importedSourceUrl || '',
        origin_country: importedData.origin_country || '',
        category_id: '',
        price_per_unit: importedData.price || 0,
        comparison_price: '',
        comparison_source: '',
        unit_name: importedData.unit_name || 'stk',
        target_quantity: 10,
        minimum_purchase: 1,
        supplier_name: importedData.supplier_name || '',
        status: 'open',
        is_organic: importedData.is_organic || false,
        notify_threshold: 2,
      });
    } else {
      setPreviewUrl(null);
      setSupplierOpen(false);
      setSettingsOpen(false);
      form.reset({
        title: '',
        description: '',
        image_url: '',
        supplier_url: '',
        origin_country: '',
        category_id: '',
        price_per_unit: 0,
        comparison_price: '',
        comparison_source: '',
        unit_name: 'stk',
        target_quantity: 10,
        minimum_purchase: 1,
        supplier_name: '',
        status: 'open',
        is_organic: false,
        notify_threshold: 2,
      });
    }
  }, [product, importedData, importedSourceUrl, form]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Fejl', description: 'Filen skal være et billede', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      form.setValue('image_url', publicUrl);
      setPreviewUrl(publicUrl);
      toast({ title: 'Billede uploadet' });
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: 'Fejl', description: 'Kunne ikke uploade billede', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    form.setValue('image_url', '');
    setPreviewUrl(null);
  };

  const onSubmit = async (values: ProductFormValues) => {
    const productData = {
      ...values,
      category_id: values.category_id || null,
      image_url: values.image_url || null,
      supplier_url: values.supplier_url || null,
      origin_country: values.origin_country || null,
      supplier_name: values.supplier_name || null,
      description: values.description || null,
      comparison_price: values.comparison_price ? Number(values.comparison_price) : null,
      comparison_source: values.comparison_source || null,
    };

    if (product) {
      await updateProduct.mutateAsync({ id: product.id, ...productData });
    } else {
      await createProduct.mutateAsync(productData as any);
    }
    onOpenChange(false);
  };

  const SectionHeader = ({ 
    open: isOpen, 
    onToggle, 
    title 
  }: { 
    open: boolean; 
    onToggle: () => void; 
    title: string; 
  }) => (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {title}
      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Rediger produkt' : importedData ? 'Importeret produkt' : 'Tilføj nyt produkt'}
          </DialogTitle>
          {importedData && (
            <p className="text-sm text-muted-foreground">
              Data er hentet automatisk. Gennemgå og juster efter behov.
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* === Grundlæggende === */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel *</FormLabel>
                  <FormControl>
                    <Input placeholder="Produktnavn" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivelse</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Produktbeskrivelse..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vælg kategori" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image upload / URL */}
            <div className="space-y-2">
              <FormLabel>Produktbillede</FormLabel>
              
              {previewUrl && (
                <div className="relative w-32 h-32">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg border" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload billede
                </Button>
              </div>

              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Eller indsæt billede-URL..." {...field} onChange={(e) => {
                        field.onChange(e);
                        setPreviewUrl(e.target.value || null);
                      }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* === Pris & mængde === */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Pris & mængde</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price_per_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fælleskøb pris (kr.) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comparison_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Normalpris (kr.)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Normalpris" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comparison_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sammenlignet med</FormLabel>
                      <FormControl>
                        <Input placeholder="F.eks. Rema1000, Netto..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enhed *</FormLabel>
                      <FormControl>
                        <Input placeholder="stk, kg, pose..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="target_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mål-mængde *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minimum_purchase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum køb *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* === Leverandør (collapsible) === */}
            <div className="border-t pt-2">
              <Collapsible open={supplierOpen} onOpenChange={setSupplierOpen}>
                <CollapsibleTrigger asChild>
                  <SectionHeader open={supplierOpen} onToggle={() => setSupplierOpen(!supplierOpen)} title="Leverandør" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="supplier_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leverandør</FormLabel>
                          <FormControl>
                            <Input placeholder="Leverandørnavn" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="origin_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Oprindelsesland</FormLabel>
                          <FormControl>
                            <Input placeholder="Danmark" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="supplier_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Leverandør link</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* === Indstillinger (collapsible) === */}
            <div className="border-t pt-2">
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                <CollapsibleTrigger asChild>
                  <SectionHeader open={settingsOpen} onToggle={() => setSettingsOpen(!settingsOpen)} title="Indstillinger" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="open">Åben</SelectItem>
                            <SelectItem value="ordered">Bestilt</SelectItem>
                            <SelectItem value="arrived">Ankommet</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notify_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notifikationstærskel</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Send email når der mangler dette antal reservationer (0 = ingen notifikation)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_organic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">
                            Økologisk produkt
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Marker hvis produktet er økologisk certificeret
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuller
              </Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                {product ? 'Gem ændringer' : 'Opret produkt'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
