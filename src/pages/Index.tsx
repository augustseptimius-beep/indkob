import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <HowItWorksSection />
      <FeaturedProductsSection />
    </Layout>
  );
};

export default Index;
