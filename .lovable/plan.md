# UX-forbedringer for Klitmøllers Indkøbsfællesskab

Efter gennemgang af hele platformen har jeg identificeret følgende væsentlige UX-forbedringer, rangeret efter impact:

---

## 1. Manglende feedback efter reservation -- brugerrejsen stopper brat

**Problem:** Når en bruger reserverer et produkt, får de kun en toast-besked. Der er ingen tydelig "hvad nu?"-guidance. Brugeren ved ikke hvornår de hører mere, hvordan betaling foregår, eller hvor de finder deres reservation.

**Løsning:** Vis en bekræftelses-dialog/modal efter reservation med:

- Bekræftelse af hvad der blev reserveret
- Næste trin ("Du får besked når produktet er bestilt hjem")
- Link til "Min side" for at se reservationen
- Progress-opdatering for produktet

---

## 2. Produktdetaljesiden mangler social proof og urgency

**Problem:** Progress-baren viser tal, men kommunikerer ikke hvem der allerede har tilmeldt sig eller hvor tæt man er på målet i menneskelige termer.

**Løsning:**

- Vis antal tilmeldte ("5 medlemmer har reserveret")
- Tilføj urgency når tæt på mål: "Kun 2 reservationer fra mål!"
- Overvej at vise navne/initialer på tilmeldte (community-følelse)

---

## 3. "Min side" reservationskort er visuelt uoverskueligt

**Problem:** Produkttitel, mængde og pris står over billedet i stedet for ved siden af. Layout-strukturen er forvirrende -- titlen og mængdeteksten er adskilt fra billedet og prisinfo.

**Løsning:** Omstrukturér reservationskortet så billede, titel, mængde og pris er i en naturlig visuel rækkefølge: billede til venstre, titel+mængde i midten, pris+status til højre.

---

## 4. Ingen empty state CTA på forsiden for nye besøgende

**Problem:** Hvis en ikke-logget bruger besøger siden, er der ingen klar onboarding-rejse. "Bliv medlem"-knappen fører til `/auth` uden context om hvad der sker efter signup.

**Løsning:** 

- "Bliv medlem"-knappen bør linke til `/auth?mode=signup` i stedet for `/auth`
- Gør det tydeligt at medlemskab er gratis i beta periode. Efter beta, når der er blevet etableret en officiel forening, koster medlemskab 10kr/mdr som dækker platformens driftsudgifter.

---

## 5. Produktkort mangler CTA

**Problem:** Produktkortene i gridden har ingen synlig handlingsknap. Hele kortet er et link, men det er ikke tydeligt at man skal klikke for at tilmelde sig.

**Løsning:** Tilføj en synlig "Tilmeld" eller "Se mere"-knap i bunden af produktkortet, eventuelt med teksten "Reserver din andel" for at gøre handlingen tydelig.

---

## 6. Mobil: Header reservation-badge mangler kontekst

**Problem:** På mobil vises kun et tal-badge ved indkøbskurv-ikonet. Der er ingen forskel på om man har 1 pending eller 1 der kræver betaling.

**Løsning:** Allerede delvist implementeret med farve-forskel (destructive for ubetalte). Kan forbedres med et lille tooltip/bottom-sheet ved tap der opsummerer status.

---

## Anbefalet prioritering


| #   | Forbedring                              | Effort    | Impact |
| --- | --------------------------------------- | --------- | ------ |
| 1   | Bekræftelses-dialog efter reservation   | Lav       | Høj    |
| 2   | Social proof + urgency på produktside   | Lav       | Høj    |
| 4   | Signup-knap → signup mode + forventning | Meget lav | Medium |
| 5   | CTA-knap på produktkort                 | Lav       | Medium |
| 3   | Omstrukturér reservationskort           | Medium    | Medium |
| 6   | Mobil badge-kontekst                    | Medium    | Lav    |


---

## Teknisk tilgang

- **Forbedring 1:** Ny `ReservationConfirmDialog` komponent med product-info, next-steps tekst og Link til `/min-side`
- **Forbedring 2:** Tilføj en count-query for reservationer pr. produkt via eksisterende `reservations`-tabel. Vis i `ProductDetailPage.tsx`
- **Forbedring 4:** Ændr `Link to="/auth"` til `Link to="/auth?mode=signup"` i HeroSection og SignupBanner
- **Forbedring 5:** Tilføj en `Button` i `ProductCard.tsx` under progress-baren
- **Forbedring 3:** Refaktorér Card-layout i `MyPage.tsx` reservationslisten