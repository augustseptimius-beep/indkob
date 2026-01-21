import { Layout } from '@/components/layout/Layout';
import { useCMSContent } from '@/hooks/useCMS';

export default function PrivacyPolicyPage() {
  const { data: content, isLoading } = useCMSContent();

  const dataCollected = content?.['privacy_policy_data_collected']?.content?.split(',').map(s => s.trim()).filter(Boolean) || [
    'Navn',
    'E-mailadresse',
    'Oplysninger om dine reservationer og køb'
  ];

  const purposes = content?.['privacy_policy_purpose']?.content?.split(',').map(s => s.trim()).filter(Boolean) || [
    'Administration af dit medlemskab og brugeroprettelse',
    'Håndtering af dine reservationer og bestillinger',
    'Kommunikation om ordrestatus og leveringer',
    'Udsendelse af notifikationer vedrørende dine reserverede varer'
  ];

  const introText = content?.['privacy_policy_intro']?.content || 
    'Klitmøllers Indkøbsforening er dataansvarlig for behandlingen af de personoplysninger, vi modtager om dig. Har du spørgsmål til vores behandling af dine oplysninger, er du velkommen til at kontakte os.';

  const contactInfo = content?.['privacy_policy_contact']?.content || 'kontakt@klitmoellers-indkoebsforening.dk';

  if (isLoading) {
    return (
      <Layout>
        <div className="container-wide py-12">
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-wide py-12">
        <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">Privatlivspolitik</h1>
          
          <p className="text-muted-foreground mb-8">
            Sidst opdateret: {new Date().toLocaleDateString('da-DK', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">1. Dataansvarlig</h2>
            <p className="text-muted-foreground">
              {introText}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">2. Hvilke oplysninger indsamler vi?</h2>
            <p className="text-muted-foreground mb-4">
              Vi indsamler følgende personoplysninger, når du opretter en konto hos os:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              {dataCollected.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">3. Formål med behandlingen</h2>
            <p className="text-muted-foreground mb-4">
              Vi behandler dine personoplysninger til følgende formål:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              {purposes.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">4. Retsgrundlag</h2>
            <p className="text-muted-foreground">
              Behandlingen af dine personoplysninger sker på baggrund af dit samtykke ved oprettelse 
              af konto samt for at opfylde aftalen om levering af varer (GDPR artikel 6, stk. 1, litra a og b).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">5. Opbevaringsperiode</h2>
            <p className="text-muted-foreground">
              Vi opbevarer dine personoplysninger, så længe du har en aktiv konto hos os. 
              Hvis du ønsker at slette din konto, vil dine personoplysninger blive slettet, 
              medmindre vi er forpligtet til at opbevare dem i henhold til lovgivning.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">6. Dine rettigheder</h2>
            <p className="text-muted-foreground mb-4">
              Du har følgende rettigheder i forhold til vores behandling af dine personoplysninger:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Indsigt:</strong> Du kan få oplyst, hvilke oplysninger vi behandler om dig</li>
              <li><strong>Berigtigelse:</strong> Du kan få rettet urigtige oplysninger</li>
              <li><strong>Sletning:</strong> Du kan i visse tilfælde få slettet dine oplysninger</li>
              <li><strong>Begrænsning:</strong> Du kan i visse tilfælde få begrænset behandlingen</li>
              <li><strong>Dataportabilitet:</strong> Du kan få udleveret dine oplysninger i et maskinlæsbart format</li>
              <li><strong>Indsigelse:</strong> Du kan gøre indsigelse mod vores behandling</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">7. Cookies</h2>
            <p className="text-muted-foreground mb-4">
              Vi bruger følgende typer cookies på vores hjemmeside:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Nødvendige cookies:</strong> Disse cookies er nødvendige for, at hjemmesiden kan fungere korrekt, 
              herunder autentificering og sikkerhedsfunktioner.</li>
              <li><strong>Præference-cookies:</strong> Disse cookies husker dine præferencer, såsom cookie-samtykke.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">8. Sikkerhed</h2>
            <p className="text-muted-foreground">
              Vi tager sikkerhed alvorligt og anvender passende tekniske og organisatoriske 
              foranstaltninger for at beskytte dine personoplysninger mod uautoriseret adgang, 
              ændring, offentliggørelse eller sletning.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">9. Kontakt</h2>
            <p className="text-muted-foreground">
              Har du spørgsmål til vores behandling af dine personoplysninger, kan du kontakte os på:{' '}
              <a href={`mailto:${contactInfo}`} className="text-primary hover:underline">
                {contactInfo}
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">10. Klageadgang</h2>
            <p className="text-muted-foreground">
              Hvis du er utilfreds med vores behandling af dine personoplysninger, kan du klage til 
              Datatilsynet. Du finder kontaktoplysninger på{' '}
              <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                www.datatilsynet.dk
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-4">11. Ændringer</h2>
            <p className="text-muted-foreground">
              Vi forbeholder os retten til at opdatere denne privatlivspolitik. Ved væsentlige 
              ændringer vil vi informere dig via e-mail eller på hjemmesiden.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
