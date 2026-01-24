import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCMSContent, useUpdateCMSContent } from '@/hooks/useCMS';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, RefreshCw } from 'lucide-react';

// Zod schema for CMS content validation - prevents overly long content and ensures data integrity
const cmsSchema = z.object({
  hero_title: z.string().max(200, 'Overskrift må max være 200 tegn').default(''),
  hero_content: z.string().max(2000, 'Brødtekst må max være 2000 tegn').default(''),
  how_it_works_title: z.string().max(200, 'Overskrift må max være 200 tegn').default(''),
  how_it_works_content: z.string().max(2000, 'Brødtekst må max være 2000 tegn').default(''),
  payment_info_title: z.string().max(100, 'Titel må max være 100 tegn').default(''),
  payment_info_content: z.string().max(50, 'MobilePay-nummer må max være 50 tegn').default(''),
  privacy_intro: z.string().max(5000, 'Introduktion må max være 5000 tegn').default(''),
  privacy_data_collected: z.string().max(2000, 'Indsamlede data må max være 2000 tegn').default(''),
  privacy_purpose: z.string().max(3000, 'Formål må max være 3000 tegn').default(''),
  privacy_contact: z.string().max(500, 'Kontaktinfo må max være 500 tegn').default(''),
});

type CMSFormValues = z.infer<typeof cmsSchema>;

export function AdminCMS() {
  const { data: cmsContent, isLoading, refetch } = useCMSContent();
  const updateContent = useUpdateCMSContent();

  const { register, handleSubmit, reset, formState: { isDirty, errors } } = useForm<CMSFormValues>({
    resolver: zodResolver(cmsSchema),
    defaultValues: {
      hero_title: '',
      hero_content: '',
      how_it_works_title: '',
      how_it_works_content: '',
      payment_info_title: '',
      payment_info_content: '',
      privacy_intro: '',
      privacy_data_collected: '',
      privacy_purpose: '',
      privacy_contact: '',
    },
  });

  useEffect(() => {
    if (cmsContent) {
      const hero = cmsContent['hero'];
      const howItWorks = cmsContent['how_it_works'];
      const paymentInfo = cmsContent['payment_info'];
      const privacyIntro = cmsContent['privacy_policy_intro'];
      const privacyData = cmsContent['privacy_policy_data_collected'];
      const privacyPurpose = cmsContent['privacy_policy_purpose'];
      const privacyContact = cmsContent['privacy_policy_contact'];

      reset({
        hero_title: hero?.title || '',
        hero_content: hero?.content || '',
        how_it_works_title: howItWorks?.title || '',
        how_it_works_content: howItWorks?.content || '',
        payment_info_title: paymentInfo?.title || 'Betalingsinfo',
        payment_info_content: paymentInfo?.content || '',
        privacy_intro: privacyIntro?.content || '',
        privacy_data_collected: privacyData?.content || '',
        privacy_purpose: privacyPurpose?.content || '',
        privacy_contact: privacyContact?.content || '',
      });
    }
  }, [cmsContent, reset]);

  const onSubmit = async (data: CMSFormValues) => {
    try {
      await Promise.all([
        updateContent.mutateAsync({ key: 'hero', title: data.hero_title, content: data.hero_content }),
        updateContent.mutateAsync({ key: 'how_it_works', title: data.how_it_works_title, content: data.how_it_works_content }),
        updateContent.mutateAsync({ key: 'payment_info', title: data.payment_info_title, content: data.payment_info_content }),
        updateContent.mutateAsync({ key: 'privacy_policy_intro', content: data.privacy_intro }),
        updateContent.mutateAsync({ key: 'privacy_policy_data_collected', content: data.privacy_data_collected }),
        updateContent.mutateAsync({ key: 'privacy_policy_purpose', content: data.privacy_purpose }),
        updateContent.mutateAsync({ key: 'privacy_policy_contact', content: data.privacy_contact }),
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
                maxLength={200}
              />
              {errors.hero_title && <p className="text-sm text-destructive mt-1">{errors.hero_title.message}</p>}
            </div>
            <div>
              <Label htmlFor="hero_content">Brødtekst</Label>
              <Textarea
                id="hero_content"
                {...register('hero_content')}
                placeholder="Beskriv konceptet her..."
                rows={4}
                maxLength={2000}
              />
              {errors.hero_content && <p className="text-sm text-destructive mt-1">{errors.hero_content.message}</p>}
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
                maxLength={200}
              />
              {errors.how_it_works_title && <p className="text-sm text-destructive mt-1">{errors.how_it_works_title.message}</p>}
            </div>
            <div>
              <Label htmlFor="how_it_works_content">Brødtekst</Label>
              <Textarea
                id="how_it_works_content"
                {...register('how_it_works_content')}
                placeholder="Forklar processen..."
                rows={4}
                maxLength={2000}
              />
              {errors.how_it_works_content && <p className="text-sm text-destructive mt-1">{errors.how_it_works_content.message}</p>}
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
                maxLength={100}
              />
              {errors.payment_info_title && <p className="text-sm text-destructive mt-1">{errors.payment_info_title.message}</p>}
            </div>
            <div>
              <Label htmlFor="payment_info_content">MobilePay-nummer</Label>
              <Input
                id="payment_info_content"
                {...register('payment_info_content')}
                placeholder="12345678"
                maxLength={50}
              />
              {errors.payment_info_content && <p className="text-sm text-destructive mt-1">{errors.payment_info_content.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Privacy Policy Section */}
        <Card>
          <CardHeader>
            <CardTitle>Privatlivspolitik</CardTitle>
            <CardDescription>
              Rediger indholdet på privatlivspolitik-siden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="privacy_intro">Introduktion (dataansvarlig)</Label>
              <Textarea
                id="privacy_intro"
                {...register('privacy_intro')}
                placeholder="Beskrivelse af dataansvarlig..."
                rows={3}
                maxLength={5000}
              />
              {errors.privacy_intro && <p className="text-sm text-destructive mt-1">{errors.privacy_intro.message}</p>}
            </div>
            <div>
              <Label htmlFor="privacy_data_collected">Indsamlede oplysninger (kommasepareret)</Label>
              <Textarea
                id="privacy_data_collected"
                {...register('privacy_data_collected')}
                placeholder="Navn, E-mailadresse, Oplysninger om reservationer"
                rows={2}
                maxLength={2000}
              />
              {errors.privacy_data_collected && <p className="text-sm text-destructive mt-1">{errors.privacy_data_collected.message}</p>}
            </div>
            <div>
              <Label htmlFor="privacy_purpose">Formål med behandlingen (kommasepareret)</Label>
              <Textarea
                id="privacy_purpose"
                {...register('privacy_purpose')}
                placeholder="Administration af medlemskab, Håndtering af reservationer..."
                rows={3}
                maxLength={3000}
              />
              {errors.privacy_purpose && <p className="text-sm text-destructive mt-1">{errors.privacy_purpose.message}</p>}
            </div>
            <div>
              <Label htmlFor="privacy_contact">Kontaktoplysninger</Label>
              <Input
                id="privacy_contact"
                {...register('privacy_contact')}
                placeholder="kontakt@example.dk"
                maxLength={500}
              />
              {errors.privacy_contact && <p className="text-sm text-destructive mt-1">{errors.privacy_contact.message}</p>}
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
