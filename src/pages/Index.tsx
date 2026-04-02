import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { HeroSection } from '@/components/home/HeroSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection';
import { SignupBanner } from '@/components/home/SignupBanner';

const Index = () => {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Klitmøllers Indkøbsfællesskab',
    url: 'https://indkob.lovable.app',
    description: 'Fælles indkøb af kvalitetsvarer i Klitmøller',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Klitmøller',
      addressCountry: 'DK',
    },
  };

  return (
    <Layout>
      <SEO
        title="Fælles indkøb af kvalitetsvarer"
        description="Klitmøllers Indkøbsfællesskab — spar penge og reducer spild ved at købe kvalitetsvarer sammen i Klitmøller."
        canonical="/"
        jsonLd={organizationJsonLd}
      />
      <HeroSection />
      <HowItWorksSection />
      <FeaturedProductsSection />
      <SignupBanner />
    </Layout>
  );
};

export default Index;
