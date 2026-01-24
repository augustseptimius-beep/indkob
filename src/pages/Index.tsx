import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection';
import { SignupBanner } from '@/components/home/SignupBanner';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <HowItWorksSection />
      <FeaturedProductsSection />
      <SignupBanner />
    </Layout>
  );
};

export default Index;
