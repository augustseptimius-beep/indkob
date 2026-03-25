

## Oprydning: "Produkt ankommet" vs "Klar til afhentning"

### Problem

Du har ret — de to er funktionelt identiske. Her er hvad der er sket:

- **"Produkt ankommet"** (`product_arrived`) var den originale email, som blev trigget af en database-trigger når produktstatus ændredes til `arrived`. Men den trigger blev fjernet i en tidligere migration, så skabelonen er **død kode** — den bruges aldrig.
- **"Klar til afhentning"** (`ready_for_pickup`) blev tilføjet senere og er den der **faktisk bruges**, når admin klikker "Marker som ankommet" i ordresektionen.

Begge gør det samme: sender email til reservatører om at produktet er ankommet og klar til betaling/afhentning.

### Plan

1. **Slet `product_arrived` skabelonen** fra databasen — den trigges aldrig
2. **Fjern den gamle `handleProductStatusEmail` "arrived"-gren** i edge-funktionen, da den kun kan nås via et legacy-format som intet i systemet kalder
3. **Opdater `AdminEmailTemplates.tsx`** — fjern `product_status_arrived` fra trigger-type listen
4. **Redeploy edge-funktionen** så oprydningen træder i kraft

### Tekniske detaljer

**Database**: Slet rækken i `email_templates` hvor `key = 'product_arrived'`

**Edge function** (`send-notification/index.ts`):
- Fjern `"arrived"` fra `productNotificationSchema.notificationType` enum (behold kun `"ordered"`)
- Fjern "arrived"-grenene i `handleProductStatusEmail` (reservation status update, payment note, fallback text for arrived)
- Alternativt: behold funktionen men kun til `ordered`, da den stadig bruges til bestillingsnotifikationer

**Frontend** (`AdminEmailTemplates.tsx`):
- Fjern `{ value: 'product_status_arrived', label: 'Produkt ankommet (auto)' }` fra `TRIGGER_TYPES`

**Frontend** (`AdminEmailLog.tsx`):
- Fjern `arrived: 'Produkt ankommet'` fra notification type labels (behold `ready_for_pickup`)

Resultatet er én klar skabelon ("Klar til afhentning") som admin kan redigere, og som trigges når admin markerer en batch som ankommet.

