import { useCMSContent } from '@/hooks/useCMS';
import { Search, MousePointerClick, Truck } from 'lucide-react';

export function HowItWorksSection() {
  const { data: content } = useCMSContent();

  const steps = [
    {
      icon: Search,
      title: content?.how_it_works_step1?.title || 'Find dit produkt',
      description:
        content?.how_it_works_step1?.content ||
        'Gennemse vores katalog og find de varer, du gerne vil være med til at bestille.',
    },
    {
      icon: MousePointerClick,
      title: content?.how_it_works_step2?.title || 'Reserver din andel',
      description:
        content?.how_it_works_step2?.content ||
        'Tilmeld dig det antal enheder, du ønsker. Se live hvor mange der mangler.',
    },
    {
      icon: Truck,
      title: content?.how_it_works_step3?.title || 'Vent på leveringen',
      description:
        content?.how_it_works_step3?.content ||
        'Når målet er nået, bestiller vi hjem. Du får besked når varen er klar til afhentning.',
    },
  ];

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container-wide">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            {content?.how_it_works_title?.title || 'Sådan fungerer det'}
          </h2>
          <div className="section-divider" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border" />
              )}

              <div className="relative bg-background rounded-2xl p-8 shadow-sm">
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>

                {/* Content */}
                <h3 className="font-serif text-xl font-semibold text-center mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-center">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
