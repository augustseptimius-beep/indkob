import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { useCMSContent } from '@/hooks/useCMS';

export default function PrivacyPolicyPage() {
  const { data: content, isLoading } = useCMSContent();

  const introText = content?.['privacy_policy_intro']?.content || 
    'Klitmøllers Indkøbsfællesskab er dataansvarlig for behandlingen af de personoplysninger, vi modtager om dig. Har du spørgsmål til vores behandling af dine oplysninger, er du velkommen til at kontakte os.';

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
              <li><strong>E-mailadresse:</strong> Bruges til login og kommunikation om dine reservationer</li>
              <li><strong>Navn:</strong> Valgfrit felt til at identificere dig i systemet</li>
              <li><strong>Reservationshistorik:</strong> Oplysninger om hvilke varer du har reserveret, mængder og status</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">3. Hvor opbevares dine data?</h2>
            <p className="text-muted-foreground mb-4">
              Dine data opbevares sikkert hos vores hostingudbyder:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Database:</strong> Dine kontooplysninger og reservationer gemmes i en sikker, krypteret database hos vores cloud-udbyder</li>
              <li><strong>Lokal lagring (localStorage):</strong> Din browser gemmer midlertidigt login-session og præferencer lokalt på din enhed</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Al dataoverførsel sker via krypteret HTTPS-forbindelse.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">4. Formål med behandlingen</h2>
            <p className="text-muted-foreground mb-4">
              Vi behandler dine personoplysninger udelukkende til følgende formål:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Administration af dit medlemskab og login</li>
              <li>Håndtering af dine reservationer og bestillinger</li>
              <li>Udsendelse af e-mail-notifikationer når dine reserverede varer skifter status</li>
              <li>Kommunikation om ordrestatus og afhentning</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">5. Retsgrundlag</h2>
            <p className="text-muted-foreground">
              Behandlingen af dine personoplysninger sker på baggrund af dit samtykke ved oprettelse 
              af konto samt for at opfylde aftalen om levering af varer (GDPR artikel 6, stk. 1, litra a og b).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">6. Opbevaringsperiode</h2>
            <p className="text-muted-foreground">
              Vi opbevarer dine personoplysninger, så længe du har en aktiv konto hos os. 
              Hvis du ønsker at slette din konto, vil dine personoplysninger blive slettet, 
              medmindre vi er forpligtet til at opbevare dem i henhold til lovgivning.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">7. Dine rettigheder</h2>
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
            <h2 className="font-serif text-xl font-semibold mb-4">8. Cookies og lokal lagring</h2>
            <p className="text-muted-foreground mb-4">
              Vi bruger <strong>ingen tracking- eller markedsføringscookies</strong>. Den eneste lagring vi anvender er:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong>Autentificerings-session (localStorage):</strong> Gemmer din login-session så du forbliver logget ind. 
                Slettes automatisk ved logout eller efter inaktivitet.
              </li>
              <li>
                <strong>Cookie-banner status (localStorage):</strong> Husker at du har set informationen om cookies, 
                så banneret ikke vises igen.
              </li>
              <li>
                <strong>Sidebar-præference (cookie):</strong> Teknisk cookie der husker om sidepanelet er åbent eller lukket.
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Alle disse er <strong>nødvendige funktionelle cookies</strong> og kræver ikke samtykke ifølge ePrivacy-direktivet, 
              da de er essentielle for hjemmesidens grundlæggende funktionalitet.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">9. Tredjeparter</h2>
            <p className="text-muted-foreground">
              Vi deler ikke dine personoplysninger med tredjeparter til markedsføringsformål. 
              Dine data behandles udelukkende af vores hostingudbyder som databehandler, 
              og dette sker i overensstemmelse med gældende databeskyttelseslovgivning.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">10. Sikkerhed</h2>
            <p className="text-muted-foreground">
              Vi tager sikkerhed alvorligt og anvender passende tekniske og organisatoriske 
              foranstaltninger for at beskytte dine personoplysninger mod uautoriseret adgang, 
              ændring, offentliggørelse eller sletning. Dette inkluderer krypterede forbindelser (HTTPS), 
              sikker autentificering og adgangskontrol til databasen.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">11. Kontakt</h2>
            <p className="text-muted-foreground">
              Har du spørgsmål til vores behandling af dine personoplysninger, kan du kontakte os på:{' '}
              <a href={`mailto:${contactInfo}`} className="text-primary hover:underline">
                {contactInfo}
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold mb-4">12. Klageadgang</h2>
            <p className="text-muted-foreground">
              Hvis du er utilfreds med vores behandling af dine personoplysninger, kan du klage til 
              Datatilsynet. Du finder kontaktoplysninger på{' '}
              <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                www.datatilsynet.dk
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold mb-4">13. Ændringer</h2>
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
