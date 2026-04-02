

## SEO-analyse: Klitmøllers Indkøbsfællesskab

### Nuværende status

**Det der virker:**
- OG-tags (title, description, image) i `index.html`
- Twitter Card tags
- `robots.txt` tillader alle crawlers
- Semantisk HTML med korrekte headings (h1, h2, h3)
- Meningsfulde link-tekster og alt-tekster på billeder
- Dansk sprog i indholdet

**Problemer fundet:**

| # | Problem | Alvor |
|---|---------|-------|
| 1 | **Ingen per-side meta-tags** — alle sider deler samme title/description fra `index.html`. Google ser "Klitmøllers Indkøbsfællesskab" som title på ALLE sider. | Kritisk |
| 2 | **Ingen sitemap.xml** — crawlers kan ikke opdage alle sider effektivt. | Høj |
| 3 | **`<html lang="en">`** — sproget er sat til engelsk, men alt indhold er dansk. Skal være `lang="da"`. | Høj |
| 4 | **Ingen canonical URLs** — risiko for duplikat-indhold-problemer. | Medium |
| 5 | **Ingen struktureret data (JSON-LD)** — ingen Schema.org markup for Organisation, produkter eller BreadcrumbList. | Medium |
| 6 | **Produktsider har ingen dynamisk OG/meta** — deling af et produkt på Facebook/LinkedIn viser generisk titel/billede i stedet for produktets. | Høj |
| 7 | **Ingen 404-side meta** — NotFound-side mangler noindex. | Lav |
| 8 | **Manglende heading-hierarki** — Layout har ingen skip-to-content link for tilgængelighed. | Lav |

### Forbedringsplan

**1. Tilføj react-helmet-async til per-side meta-tags**
- Installer `react-helmet-async`
- Opret en `<SEO>` komponent med props: `title`, `description`, `image`, `canonical`, `noindex`
- Tilføj `<SEO>` til hver side med unikke titler og beskrivelser:
  - Forside: "Klitmøllers Indkøbsfællesskab — Fælles indkøb i Klitmøller"
  - Produkter: "Produkter — Klitmøllers Indkøbsfællesskab"
  - Produkt-detalje: "{Produktnavn} — Klitmøllers Indkøbsfællesskab" (dynamisk)
  - Om os: "Om os — Klitmøllers Indkøbsfællesskab"
  - Ønskeliste: "Ønskeliste — Klitmøllers Indkøbsfællesskab"
  - Privatlivspolitik: "Privatlivspolitik — Klitmøllers Indkøbsfællesskab"

**2. Ret `<html lang="en">` til `lang="da"`**
- Simpel ændring i `index.html`

**3. Generer sitemap.xml**
- Opret en statisk `public/sitemap.xml` med alle offentlige ruter
- Tilføj reference i `robots.txt`

**4. Tilføj canonical URL til alle sider**
- Via `<SEO>`-komponenten

**5. Tilføj JSON-LD struktureret data**
- `Organization` schema på forsiden
- `BreadcrumbList` på produkt- og undersider
- `Product` schema på produktdetaljesider (med pris, tilgængelighed)

**6. Dynamisk OG-tags på produktsider**
- Produkttitel som og:title, beskrivelse som og:description, produktbillede som og:image

**7. Tilføj noindex til 404-side og login/min-side**
- Sider bag login bør have noindex

### Tekniske detaljer

Filer der oprettes/ændres:
- `index.html` — ret `lang="da"`
- `src/components/SEO.tsx` — ny komponent med react-helmet-async
- `src/main.tsx` — wrap med `HelmetProvider`
- Alle side-filer — tilføj `<SEO>` med unikke værdier
- `public/sitemap.xml` — ny fil
- `public/robots.txt` — tilføj sitemap-reference