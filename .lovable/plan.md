

## Oprydningsplan — sikker, ikke-funktionel oprydning

Hele planen er **rent kosmetisk/intern**. Brugeroplevelsen ændres ikke, og **databasen røres ikke** (ingen migrationer, ingen ændringer i RLS, triggers, tabeller eller edge functions). Daglige drift-flows (reservationer, "Bestilt hjem", betalinger, afhentning, e-mails) berøres ikke.

### Hvad jeg har fundet

**1. Død kode (filer der ikke importeres nogen steder)**
- `src/App.css` — gammel Vite-skabelonstil (logo-spin, `#root` max-width 1280px), bruges ikke. Ikke importeret nogen steder. Al styling kommer fra `index.css` + Tailwind.
- `src/components/NavLink.tsx` — defineret men aldrig importeret. Alle navigationslinks bruger `react-router-dom` direkte.
- `src/tailwind.config.lov.json` — ikke refereret nogen steder i koden eller build-konfigurationen.
- `src/test/example.test.ts` — placeholder-test ("expect(true).toBe(true)"), ingen reel værdi.

**2. Duplikeret fil (kan fjernes uden risiko)**
- `src/components/ui/use-toast.ts` re-eksporterer kun `src/hooks/use-toast.ts`. Ingen filer importerer fra `@/components/ui/use-toast` (kun `@/hooks/use-toast` bruges). Filen er ren støj.

**3. Inkonsistent toast-system (kun forslag — ingen ændring i drift)**
- Projektet bruger **både** shadcn-toast (`@/hooks/use-toast` med `<Toaster />` i `App.tsx`) **og** Sonner (`<Sonner />` i `App.tsx`). 4 filer bruger shadcn-varianten (AdminCategories, AdminPage, ProductImportDialog, ProductFormDialog), 18 filer bruger Sonner.
- **Anbefaling: rør IKKE ved dette nu.** En migrering kræver at jeg ændrer toast-kald i 4 admin-filer, og det kan utilsigtet ændre præcis hvordan admin ser fejlbeskeder. Jeg noterer det som en fremtidig opgave i stedet.

**4. Defensive ubrugte UI-komponenter fra shadcn (rør IKKE)**
- `aspect-ratio.tsx`, `carousel.tsx`, `chart.tsx`, `context-menu.tsx`, `drawer.tsx`, `hover-card.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `resizable.tsx`, `input-otp.tsx` — flere bruges ikke aktivt. Men shadcn-komponenter er bibliotek-style og må gerne ligge der. Sletning kan bryde fremtidige tilføjelser uventet. **Lader dem være.**

### Ændringer der udføres

| Fil | Handling | Risiko |
|---|---|---|
| `src/App.css` | Slet | Ingen — ikke importeret |
| `src/components/NavLink.tsx` | Slet | Ingen — ikke importeret |
| `src/tailwind.config.lov.json` | Slet | Ingen — ikke refereret |
| `src/test/example.test.ts` | Slet | Ingen — placeholder |
| `src/components/ui/use-toast.ts` | Slet | Ingen — kun re-eksport, intet importerer den |

**Det er hele oprydningen.** 5 filer slettet, 0 linjer ændret i aktive komponenter, 0 database-ændringer, 0 ændringer i edge functions, 0 ændringer i pakker.

### Hvad jeg eksplicit IKKE rører

- Ingen `npm`/`bun` ændringer (ingen pakker fjernes — selvom `next-themes`, `vaul`, `embla-carousel-react` osv. har lille brug, kan en pakkeopdatering bryde build).
- Ingen ændringer i `console.error`-kald — de er nyttige i produktion til debugging og påvirker ikke UX.
- Ingen ændringer i `src/hooks/useReservationCount.ts` — bruges aktivt i ProductDetailPage.
- Ingen ændringer i `OrganicBadge`, `SEO`, layout, hooks, contexts, edge functions eller migrations.
- Ingen visuelle eller adfærdsmæssige ændringer.

### Verifikation efter ændringen

Efter sletning kører jeg en TypeScript-check (`tsc --noEmit` via vite build) for at bekræfte at intet brækker. Hvis noget uventet refererer en slettet fil, ruller jeg tilbage med det samme.

