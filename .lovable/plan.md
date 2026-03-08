

# UX-forbedringer for Admin-panelet

## 1. Produktlisten mangler filtrering og søgning

**Problem:** AdminProducts viser alle produkter i en flad liste uden mulighed for at søge, filtrere på status (åben/bestilt/ankommet) eller kategori. Ved mange produkter bliver det uoverskueligt.

**Løsning:**
- Søgefelt der filtrerer på produktnavn
- Filter-dropdown for status (Alle / Åben / Bestilt / Ankommet)
- Filter-dropdown for kategori
- Vis samlet antal filtrerede produkter

## 2. Ordrer-fanen mangler overblik/statistik

**Problem:** AdminOrders har fire sektioner (betalinger, klar til bestilling, afventer, batches) men ingen hurtig opsummering. Admin skal scrolle for at forstå den samlede status.

**Løsning:**
- Tilføj statistik-kort i toppen: "Afventende betalinger", "Klar til bestilling", "Bestilte batches", "Klar til afhentning"
- Kort med tal og farver der giver instant overblik

## 3. Produktformularen er lang og uoverskuelig

**Problem:** ProductFormDialog har 15+ felter i en lang scroll-liste. Relaterede felter (pris/sammenligning, leverandør-info, indstillinger) er blandet sammen.

**Løsning:**
- Gruppér felter i collapsible sektioner eller tabs: "Grundlæggende" (titel, beskrivelse, billede), "Priser" (pris, sammenligning), "Leverandør" (navn, land, link), "Indstillinger" (status, organisk, tærskel)
- Vis de vigtigste felter åbne, sekundære collapsed

## 4. Kategorier viser ikke antal tilknyttede produkter

**Problem:** Kategorilisten viser kun navne. Admin kan ikke se om en kategori er i brug eller tom, hvilket gør det risikabelt at slette.

**Løsning:**
- Vis antal produkter pr. kategori med et badge ("12 produkter")
- Gør tomme kategorier visuelt tydeligere

## 5. Dashboard-faner mangler notifikations-badges

**Problem:** Admin-fanerne (Produkter, Ordrer, Emails, etc.) viser ingen indikation af om der er handlinger der kræver opmærksomhed. Admin skal klikke rundt for at opdage f.eks. ubetalte ordrer.

**Løsning:**
- Tilføj tal-badges på relevante faner: Ordrer (antal ubetalte), Log (antal fejlede emails)
- Brug farve til at indikere urgency (rød for ubetalte)

## 6. Email-log mangler paginering

**Problem:** Email-loggen henter max 500 rækker og viser dem alle i én tabel. Ved mange emails bliver det tungt og uoverskueligt.

**Løsning:**
- Tilføj paginering (samme mønster som AdminUsers)
- Vis "Viser 1-20 af 347" med side-navigation

---

## Anbefalet prioritering

| # | Forbedring | Effort | Impact |
|---|-----------|--------|--------|
| 5 | Notifikations-badges på faner | Lav | Høj |
| 2 | Statistik-kort på Ordrer-fanen | Lav | Høj |
| 1 | Søgning/filtrering på produktlisten | Lav | Høj |
| 4 | Antal produkter pr. kategori | Meget lav | Medium |
| 6 | Paginering i email-log | Lav | Medium |
| 3 | Gruppér produktformular-felter | Medium | Medium |

## Teknisk tilgang

- **Forbedring 5:** Hent counts i `AdminPage.tsx` (ubetalte reservationer, fejlede emails) og vis som Badge på TabsTrigger
- **Forbedring 2:** Tilføj stat-cards over sektionerne i `AdminOrders.tsx` med de allerede beregnede værdier
- **Forbedring 1:** Tilføj søge-Input og status/kategori-Select i `AdminProducts.tsx` med client-side filtrering
- **Forbedring 4:** Join products count i `useCategories()` eller lav en separat count-query i `AdminCategories.tsx`
- **Forbedring 6:** Tilføj paginering i `AdminEmailLog.tsx` (samme mønster som AdminUsers)
- **Forbedring 3:** Wrap felter i Collapsible/Accordion i `ProductFormDialog.tsx`

