import { Layout } from '@/components/layout/Layout';
import { Users, Leaf, Package, Heart, MapPin } from 'lucide-react';
import initiativtagerImg from '@/assets/initiativtager.jpeg';

export default function AboutPage() {
  return (
    <Layout>
      <main className="container-wide py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-6">
            Om Klitmøllers Indkøbsfællesskab
          </h1>

          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Klitmøllers Indkøbsfællesskab er et lokalt fællesskab i Klitmøller, hvor beboere går
            sammen om at købe kvalitetsvarer i store partier — til bedre priser og med
            mindre spild.
          </p>

          {/* Values */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold mb-2">Fællesskab</h3>
              <p className="text-muted-foreground text-sm">
                Vi tror på, at de bedste løsninger opstår, når naboer hjælper hinanden. Ved at
                samle vores indkøb får vi adgang til varer, vi ellers ikke kunne købe enkeltvis.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Leaf className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold mb-2">Bæredygtighed</h3>
              <p className="text-muted-foreground text-sm">
                Store fælles indkøb betyder mindre emballage, færre transporter og reduceret
                madspild. Det er godt for både pengepungen og planeten.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold mb-2">Kvalitet</h3>
              <p className="text-muted-foreground text-sm">
                Vi prioriterer kvalitetsvarer — ofte økologiske — direkte fra leverandører, så du
                ved præcis hvad du får.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold mb-2">Frivilligt drevet</h3>
              <p className="text-muted-foreground text-sm">
                Indkøbsfællesskabet drives af frivillige kræfter fra lokalsamfundet. Der er ingen
                profit — kun fælles gevinst.
              </p>
            </div>
          </section>

          {/* How it works */}
          <section className="mb-16">
            <h2 className="font-serif text-2xl font-bold mb-6">Sådan fungerer det</h2>
            <ol className="space-y-4 text-muted-foreground">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">1</span>
                <p><strong className="text-foreground">Opret en konto</strong> — Tilmeld dig gratis og bliv en del af fællesskabet.</p>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">2</span>
                <p><strong className="text-foreground">Reserver varer</strong> — Se udvalget og reserver den mængde, du ønsker.</p>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">3</span>
                <p><strong className="text-foreground">Vi samler bestillingen</strong> — Når nok medlemmer har reserveret, bestiller vi samlet fra leverandøren.</p>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">4</span>
                <p><strong className="text-foreground">Afhent dine varer</strong> — Du får besked, når varerne er klar til afhentning i Klitmøller.</p>
              </li>
            </ol>
          </section>

          {/* About the founder */}
          <section className="mb-16">
            <h2 className="font-serif text-2xl font-bold mb-6">Personen bag</h2>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <img
                src={initiativtagerImg}
                alt="Initiativtager til Klitmøllers Indkøbsfællesskab"
                className="w-32 h-32 rounded-2xl object-cover flex-shrink-0"
              />
              <p className="text-muted-foreground leading-relaxed">
                Jeg hedder Andreas og er initiativtager til Klitmøllers Indkøbsfællesskab. Min hustru og jeg flyttede til Klitmøller i 2022, og i 2024 blev vi forældre til en datter. Vi bor i Redebyg. Tanken om et indkøbsfællesskab opstod, fordi jeg savnede nem adgang til gode råvarer til fornuftige priser herude. Ved at gå sammen kan vi som naboer få adgang til noget bedre — og samtidig lære hinanden lidt bedre at kende.
              </p>
            </div>
          </section>

          {/* Location */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-serif text-2xl font-bold">Hvor finder du os?</h2>
            </div>
            <p className="text-muted-foreground">
              Vi holder til i Klitmøller, Thy — Danmarks Cold Hawaii. Afhentning af varer sker
              lokalt efter nærmere aftale.
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}
