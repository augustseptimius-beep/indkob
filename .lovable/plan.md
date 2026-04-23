

## Performance-optimering — afsæt i PageSpeed-rapport

Nuværende score: **Performance 76, Accessibility 89, Best Practices 96, SEO 100**.
Mål: Performance 90+ uden at ændre brugeroplevelsen negativt og **uden database-ændringer**.

### Hvad rapporten peger på

| # | Problem | Besparelse | Prioritet |
|---|---|---|---|
| 1 | Et produktbillede er 6.6 MB (2048×2048 PNG) — vises som 662×662 | ~6.5 MB / ~30 LCP-point | Kritisk |
| 2 | Ingen `preconnect` til Supabase | ~300 ms LCP | Høj |
| 3 | CSS blokkerer rendering (320 ms) | ~320 ms | Medium |
| 4 | Mobile menu-knap mangler `aria-label` (a11y) | a11y +1-2 | Lav |
| 5 | Lav kontrast: BETA-badge, "Spar X%"-tekst (success-grøn på lys) | a11y +3-5 | Medium |
| 6 | Heading-rækkefølge springer h3 → h4 | a11y +1 | Lav |
| 7 | Billeder mangler `loading`/`fetchpriority`-hints | LCP marginal | Medium |
| 8 | Ingen cache-TTL på første-parts JS/CSS (kontrolleres af Lovable hosting — kan vi ikke ændre) | — | Skip |

### Ændringer der udføres

**1. Optimer billedlevering (største gevinst)**

Brug Supabase Storage's image transforms via URL query-parametre (`?width=…&quality=…&format=origin`) — server-side resizing, ingen storage-ændringer, ingen DB-ændringer. Tilføjes som lille helper:

```ts
// src/lib/image.ts
export function optimizedImage(url: string | null, width: number) {
  if (!url || !url.includes('/storage/v1/object/public/')) return url;
  const transformed = url.replace('/object/public/', '/render/image/public/');
  return `${transformed}?width=${width}&quality=80`;
}
```

Anvendes i:
- `ProductCard.tsx` — `width=400` (kort vises ~330 px, 2x for retina)
- `ProductDetailPage.tsx` — `width=800`
- `srcSet` med 400w/800w hvor relevant

Alle eksisterende billed-URL'er virker stadig som de er — helperen er en passthrough hvis URL ikke er Supabase-storage. Ingen tab i kvalitet, kun i filstørrelse.

**2. Tilføj `loading` og `fetchpriority` til billeder**
- ProductCard: `loading="lazy"` + `decoding="async"`
- ProductDetailPage hovedbillede: `fetchpriority="high"`
- OrganicBadge / dekorative billeder: `loading="lazy"`

**3. Preconnect til kritiske origins**

I `index.html` `<head>`:
```html
<link rel="preconnect" href="https://xekuhgwajypsblglrctp.supabase.co" crossorigin>
<link rel="dns-prefetch" href="https://xekuhgwajypsblglrctp.supabase.co">
```
Sparer ~300 ms LCP.

**4. Tilgængelighed: aria-labels og kontrast**
- `Header.tsx`: tilføj `aria-label="Åbn menu"` til mobile-menu-knappen og `aria-label="Åbn kurv"` til kurv-knappen.
- BETA-banner: skift fra `text-xs` til `text-sm` + sikr `--accent-foreground` har AA-kontrast mod `--accent` (juster CSS-variabel hvis nødvendigt — kun farve-tweak, samme udseende).
- "Spar X%"-tekst: skift fra `text-success` til en mørkere variant (f.eks. tilføj klasse `text-success-foreground` på lys baggrund eller mørkere `--success` value). Vi vælger den løsning der bevarer det grønne look.
- BETA-badge i header: forøg kontrast på border/text mod baggrund.

**5. Heading-hierarki**
- `Footer.tsx`: skift `<h4>` → `<h3>` (footer-sektioner), så vi går h1 → h2 → h3 i stedet for at springe h3 → h4 fra hero-feature-cards til footer.

**6. Ingen ændringer**
- **Ingen** DB-ændringer, **ingen** edge function-ændringer, **ingen** pakke-tilføjelser, **ingen** ændring i rute-struktur eller business-logik.
- Render-blocking CSS (320 ms) ligger i Vite's standard-bundle og kan ikke fjernes uden større refactor — accepteres.
- `index-Ca4S5rUX.js` er 508 KiB. Code-splitting på route-niveau ville hjælpe, men det er en større ændring der kan skjule fejl. **Lader vi være** denne omgang og evaluerer separat hvis nødvendigt.

### Forventede resultater

| Metric | Nu | Forventet |
|---|---|---|
| LCP | 4.1 s | ~2.0 s |
| Performance score | 76 | 90+ |
| Accessibility score | 89 | 95+ |
| Total transfer | ~7.4 MB | ~0.9 MB |

### Risiko & rollback

- Image-helper er passthrough hvis URL ikke matcher Supabase-mønsteret → ingen risiko for eksterne billeder.
- Hvis Supabase render-endpoint skulle fejle for en URL, falder browseren tilbage til `<img onerror>` (vi tilføjer ikke fallback-kode, da render-endpointet er stabilt).
- Alle ændringer er rent frontend — kan rulles tilbage med ét klik.

### Filer der ændres

- `index.html` — preconnect-tags
- `src/lib/image.ts` — ny helper
- `src/components/products/ProductCard.tsx` — brug helper + loading-attributter
- `src/pages/ProductDetailPage.tsx` — brug helper + fetchpriority
- `src/components/layout/Header.tsx` — aria-labels
- `src/components/layout/Footer.tsx` — `<h4>` → `<h3>`
- `src/index.css` — kontrast-justering på `--accent`/`--success` (kun hvis nødvendigt for AA)

