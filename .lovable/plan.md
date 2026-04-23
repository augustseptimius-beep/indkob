

## Performance-plan: 91 → 98–100 (mobil)

LCP er nu 2,9 s med **2.310 ms "Element render delay"**. Det betyder serveren svarer øjeblikkeligt (TTFB 0 ms), men hero-teksten (LCP-elementet) er **bevidst gjort usynlig** indtil JavaScript er parset OG en CSS-animation har spillet i 700 ms. Det er den klart største blocker — og den er gratis at fjerne.

### Hovedindgreb (sorteret efter LCP-effekt)

**1. Fjern animation fra LCP-elementet (~1.500–2.000 ms LCP-gevinst)**

Hero-`<p>` har klasserne `animate-slide-up delay-200`, som starter med `opacity: 0` og venter 200 ms før den fader ind over 500 ms. Lighthouse måler først LCP når elementet er synligt → vi mister 700 ms direkte, plus alt JS-parse-tid før CSS-animationen overhovedet starter.

Fix: Fjern `animate-slide-up delay-*` fra hero-`<h1>`, hero-`<p>` (begge) og badge i `HeroSection.tsx`. Behold animationer på elementer længere nede (feature-cards, CTA-knapper) — de påvirker ikke LCP.

Ingen visuel forskel for brugeren udover at hero-tekst er synlig fra første frame i stedet for at fade ind. Det føles **hurtigere**, ikke dårligere.

**2. Inline kritisk CSS-init (sparer 160 ms render-blocking)**

Tilføj minimal critical CSS direkte i `<head>` i `index.html` (font-family, body bg, container-wide width) så første paint ikke venter på `index-*.css` (160 ms på mobil 4G). Hovedstylesheet loades stadig normalt — vi inliner kun ~1 KB der dækker above-the-fold layout.

**3. Reducer ubrugt JS i hovedbundle (93 KiB → ~30 KiB)**

PSI siger 92,7 KiB af de 180 KiB JS er ubrugt på forsiden. Mistænkte i hovedbundle der ikke bruges på `/`:
- `CartSidebar` + `CartConfirmDialog` — kan lazy-loades og kun mountes når kurv åbnes
- `CookieBanner` + `ConsentModal` — kan defer-mountes efter `requestIdleCallback`
- Tunge ikoner fra `lucide-react` — allerede tree-shaken, men vi tjekker at vi ikke importerer hele pakken nogen steder

Fix:
- Convert `CartSidebar`, `CookieBanner`, `ConsentModal` til `React.lazy()` i `App.tsx`, mount dem i en separat `<Suspense fallback={null}>` der renderes efter hovedindhold (eller via `requestIdleCallback`-hook).
- Audit `useProducts`/`HeroSection` for tunge imports der trækker dialog-komponenter ind utilsigtet.

**4. Defer ikke-kritiske data-queries**

Hero kører en `member-count`-query mod Supabase som blokerer hydration-værdig render. Den er ikke kritisk for LCP — vi kan:
- Lade den køre uændret (queries er allerede asynkrone og blokerer ikke render), men sikre at `<HeroSection>` rendrer fuldt ud uden at vente på `memberCount` (det gør den allerede pga. `memberCount !== undefined` check). **Ingen ændring nødvendig** — verificeret.

**5. Tilføj `font-display: swap` (hvis ikke sat)**

Kontroller at Playfair Display + DM Sans har `font-display: swap` så tekst renderes i fallback-font med det samme. Hvis fonts loades via Google Fonts URL: tilføj `&display=swap` parameter.

### Ikke ændret

- **Render-blocking CSS reduktion ud over inlining**: Vite bundler kan ikke trivielt splitte runtime-CSS uden større refactor — accepteres efter inlining af kritisk CSS.
- **Cache TTL på første-parts assets**: kontrolleres af Lovable hosting, kan ikke ændres.
- **rawfoodshop.dk billede (10 KiB savings)**: eksternt billede, vi kan ikke optimere det server-side. Det er allerede `loading="lazy"` og below-the-fold.
- **DOM size (320 elementer)**: under tærskel, ingen handling.
- **Database, edge functions, business-logik**: rør ikke.

### Filer der ændres

- `src/components/home/HeroSection.tsx` — fjern `animate-slide-up delay-*` fra h1 + 2 p-tags + badge (4 steder)
- `index.html` — inline kritisk CSS (~1 KB) i `<head>`, sikr `display=swap` på fonts
- `src/App.tsx` — `React.lazy()` på `CartSidebar`, `CookieBanner`, `ConsentModal` med deferred mount
- (evt.) `src/index.css` — ingen ændring, animationerne bevares til andre komponenter

### Forventet resultat

| Metric | Nu | Forventet |
|---|---|---|
| LCP | 2,9 s | 0,9–1,3 s |
| FCP | 2,0 s | 1,0–1,4 s |
| Performance | 91 | **98–100** |

### Risiko

- Fjernelse af animation på hero: **ingen funktionel risiko**, kun mikro-visuel ændring (tekst er synlig med det samme i stedet for at fade ind).
- Lazy-mount af CartSidebar/CookieBanner: kurv-knap åbner stadig sidebar (Suspense fallback={null} mens chunk loader, ~50 ms på første åbning — derefter cached). Cookie-banner vises bare 100–200 ms senere efter hovedindhold er render'et — bedre UX.
- Inline critical CSS: hvis værdier divergerer fra hovedstylesheet kan der opstå et FOUC-flicker. Vi holder inline-CSS minimal og identisk med tokens i `index.css`.
- Alle ændringer er rent frontend, kan rulles tilbage med ét klik.

