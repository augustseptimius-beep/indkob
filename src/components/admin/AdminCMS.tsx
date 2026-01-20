import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCMSContent, useUpdateCMSContent } from '@/hooks/useCMS';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, RefreshCw } from 'lucide-react';

interface CMSFormValues {
  hero_title: string;
  hero_content: string;
  how_it_works_title: string;
  how_it_works_content: string;
  payment_info_title: string;
  payment_info_content: string;
}

export function AdminCMS() {
  const { data: cmsContent, isLoading, refetch } = useCMSContent();
  const updateContent = useUpdateCMSContent();

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<CMSFormValues>({
    defaultValues: {
      hero_title: '',
      hero_content: '',
      how_it_works_title: '',
      how_it_works_content: '',
      payment_info_title: '',
      payment_info_content: '',
    },
  });

  useEffect(() => {
    if (cmsContent) {
      const hero = cmsContent['hero'];
      const howItWorks = cmsContent['how_it_works'];
      const paymentInfo = cmsContent['payment_info'];

      reset({
        hero_title: hero?.title || '',
        hero_content: hero?.content || '',
        how_it_works_title: howItWorks?.title || '',
        how_it_works_content: howItWorks?.content || '',
        payment_info_title: paymentInfo?.title || 'Betalingsinfo',
        payment_info_content: paymentInfo?.content || '',
      });
    }
  }, [cmsContent, reset]);

  const onSubmit = async (data: CMSFormValues) => {
    try {
      await Promise.all([
        updateContent.mutateAsync({ key: 'hero', title: data.hero_title, content: data.hero_content }),
        updateContent.mutateAsync({ key: 'how_it_works', title: data.how_it_works_title, content: data.how_it_works_content }),
        updateContent.mutateAsync({ key: 'payment_info', title: data.payment_info_title, content: data.payment_info_content }),
      ]);
      toast.success('Indhold opdateret!');
      reset(data);
    } catch (error) {
      toast.error('Kunne ikke opdatere indhold');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Indlæser CMS indhold...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Rediger forsidens indhold</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Genindlæs
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Hero Section */}
        <Card>
          <CardHeader>
            <CardTitle>Hero sektion</CardTitle>
            <CardDescription>
              Hovedoverskrift og intro-tekst øverst på forsiden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hero_title">Overskrift</Label>
              <Input
                id="hero_title"
                {...register('hero_title')}
                placeholder="Velkommen til..."
              />
            </div>
            <div>
              <Label htmlFor="hero_content">Brødtekst</Label>
              <Textarea
                id="hero_content"
                {...register('hero_content')}
                placeholder="Beskriv konceptet her..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* How It Works Section */}
        <Card>
          <CardHeader>
            <CardTitle>Sådan fungerer det</CardTitle>
            <CardDescription>
              Tekst til "Sådan fungerer det" sektionen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="how_it_works_title">Overskrift</Label>
              <Input
                id="how_it_works_title"
                {...register('how_it_works_title')}
                placeholder="Sådan fungerer det"
              />
            </div>
            <div>
              <Label htmlFor="how_it_works_content">Brødtekst</Label>
              <Textarea
                id="how_it_works_content"
                {...register('how_it_works_content')}
                placeholder="Forklar processen..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Betalingsinformation</CardTitle>
            <CardDescription>
              MobilePay-nummer og betalingsinstruktioner der vises når varer er klar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="payment_info_title">Titel</Label>
              <Input
                id="payment_info_title"
                {...register('payment_info_title')}
                placeholder="Betalingsinfo"
              />
            </div>
            <div>
              <Label htmlFor="payment_info_content">MobilePay-nummer</Label>
              <Input
                id="payment_info_content"
                {...register('payment_info_content')}
                placeholder="12345678"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || updateContent.isPending} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {updateContent.isPending ? 'Gemmer...' : 'Gem ændringer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
