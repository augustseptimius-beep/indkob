

# Prioriteret forbedringsplan for Klitmøllers Indkøbsforening

Herunder er forbedringerne prioriteret efter, hvad der giver mest vaerdi for brugerne og platformen lige nu. Jeg har vurderet hvert punkt ud fra: hvor mange brugere det pavirker, hvor kritisk det er for kerneoplevelsen, og hvor hurtigt det kan implementeres.

---

## Prioritet 1: UX - Brugeren kan ikke aendre eller annullere sin reservation

**Problem:** Nar en bruger har reserveret et produkt, er der ingen mulighed for at aendre antal eller annullere reservationen fra "Min side". Hooks til `useDeleteReservation` og `useUpdateReservation` eksisterer allerede i koden, men de bruges ikke i brugerens interface.

**Losning:**
- Tilfoej "Aendr" og "Annuller" knapper pa hver reservation pa "Min side"
- Annuller-knap med bekraeftelsesdialog
- Mulighed for at justere antal (op/ned) direkte pa reservationen
- Kun muligt nar produktet stadig har status `open` (ikke nar det er bestilt hjem)

**Pavirkning:** Hoj - dette er en helt grundlaeggende funktion som alle brugere har brug for.

---

## Prioritet 2: UX - Soegning og filtrering pa produktsiden

**Problem:** Produktsiden har kategorifilter, men ingen soegefunktion. Med 8 produkter og voksende sortiment bliver det svaerere at finde det man leder efter.

**Losning:**
- Tilfoej et soegefelt oevre pa produktsiden der filtrerer pa titel, beskrivelse og leverandoernavn
- Tilfoej sorteringsmuligheder: Nyeste, Stoerste besparelse, Taettest pa mal

**Pavirkning:** Middel - forbedrer navigation og overblik, saerligt nar sortimentet vokser.

---

## Prioritet 3: UX - Visning af brugernavne i admin-ordrer i stedet for user_id

**Problem:** I admin-ordresiden ("Afventende betalinger") vises reservationer med `reservation.user_id.slice(0, 8)...` - et afkortet UUID der er ulaeseligt for admin. Admin kan ikke se hvem der skylder betaling.

**Losning:**
- Join med `profiles`-tabellen sa brugerens navn og email vises i stedet for user_id
- Opdater `useAllReservations` til ogsa at hente profil-data (eller lav et separat lookup)

**Pavirkning:** Hoj for admin - goer daglig drift langt nemmere.

---

## Prioritet 4: UX - "Glemt adgangskode" funktionalitet

**Problem:** Der er ingen "Glemt adgangskode" mulighed pa login-siden. Hvis en bruger glemmer sin kode, kan de ikke komme ind.

**Losning:**
- Tilfoej et "Glemt adgangskode?" link pa login-formularen
- Implementer password reset flow via `supabase.auth.resetPasswordForEmail()`
- Tilfoej en side/modal til at indsamle email og sende reset-link

**Pavirkning:** Hoj - kritisk for at brugere kan komme tilbage pa platformen.

---

## Prioritet 5: UX - Produktsiden viser ogsa afsluttede/gamle produkter

**Problem:** Produktsiden viser alle produkter inklusiv afsluttede. For nye brugere kan det vaere forvirrende at se produkter man ikke kan reservere.

**Losning:**
- Vis som standard kun `open` og `ordered` produkter
- Tilfoej en toggle/filter: "Vis ogsa afsluttede" for at se historik
- Sorter abne produkter forst, derefter efter oprettelsesdato

**Pavirkning:** Middel - giver renere overblik og bedre foerstegangoplevelse.

---

## Prioritet 6: Backend - Admin kan ikke se brugernavn pa betalinger

**Problem:** Nar admin skal haandtere betalinger via MobilePay, kan de ikke matche en reservation med det navn der star i MobilePay-appen, fordi brugernavnet ikke vises.

**Losning:** (Delvist overlappende med Prioritet 3)
- I "Afventende betalinger"-sektionen, vis brugerens fulde navn og email tydeligt
- Eventuelt tilfoej et felt sa admin kan notere MobilePay-transaktions-ID

**Pavirkning:** Hoj for admin - goer betalingshondtering praktisk mulig.

---

## Prioritet 7: UX - Mobiloptimering af produktdetaljesiden

**Problem:** Reservationsomradet pa produktdetaljesiden er ikke optimeret til mobil. Number-input feltet og knapperne kan vaere svaere at betjene pa sma skaerme.

**Losning:**
- Goer reservations-sektionen sticky i bunden af skaermen pa mobil
- Stoerre touch-venlige knapper til +/- mængdejustering
- Forenkling af layoutet pa sma skaerme

**Pavirkning:** Middel - mange brugere vil tilga platformen fra mobilen.

---

## Opsummering: Anbefalet raekkefoelje

| Nr. | Type | Forbedring | Estimeret indsats |
|-----|------|-----------|-------------------|
| 1 | UX | Aendr/annuller reservation fra Min side | Lille |
| 2 | UX | Soegning og sortering pa produktsiden | Lille |
| 3 | UX/Backend | Vis brugernavne i admin-ordrer | Lille |
| 4 | UX | Glemt adgangskode | Lille |
| 5 | UX | Filtrer afsluttede produkter fra | Lille |
| 6 | Backend/UX | Forbedret betalingsoversigt for admin | Lille-Middel |
| 7 | UX | Mobiloptimering af produktside | Middel |

Alle forbedringerne er relativt hurtige at implementere og bygger pa eksisterende kode og arkitektur. Prioritet 1, 3 og 4 er de mest kritiske for daglig brug af platformen.

---

## Tekniske detaljer

**Prioritet 1 (Reservation CRUD):**
- Tilfoej `useDeleteReservation` og `useUpdateReservation` kald i `MyPage.tsx`
- Opret inline-redigering med quantity input og bekraeftelses-dialog for sletning
- Betingelse: kun vis edit/slet nar `reservation.product?.status === 'open'`

**Prioritet 3 (Admin brugernavne):**
- Udvid `useAllReservations` queryet med profile join: `product:products(*), profile:profiles!user_id(full_name, email)`
- Alternativt: lav et separat profile-lookup da reservations-tabellens foreign key ikke direkte refererer til profiles

**Prioritet 4 (Password reset):**
- Kald `supabase.auth.resetPasswordForEmail(email)` fra AuthPage
- Tilfoej en "recovery" state i AuthPage formularen
- Opret eventuel email-skabelon til password reset (styres via Supabase Auth settings)

