## Plan: Tillad admin at bestille hjem før mål er nået

I admin-ordresiden under sektionen **"Afventer flere tilmeldinger"** tilføjes en knap, så admin kan force-bestille et produkt selvom målet ikke er nået.

### Ændringer i `src/components/admin/AdminOrders.tsx`

1. I hvert kort under `awaitingMore`-sektionen tilføjes en sekundær knap **"Bestil hjem alligevel"** (med `Truck`-ikon, `variant="outline"`).
2. Klik på knappen:
   - Viser en `confirm()`-dialog: *"Produktet har kun nået X af Y. Vil du bestille det hjem alligevel?"*
   - Hvis bekræftet, kalder eksisterende `markProductAsOrdered(product.id)`.
3. Genbruger den eksisterende `updatingStatus`-state til at vise loading.

### Hvorfor dette virker uden DB-ændringer

Den eksisterende trigger `reset_product_quantity_on_order` håndterer allerede status-ændring til `ordered` korrekt: alle `pending`-reservationer for produktet flyttes til `ordered`, notifikationer udsendes, og produktet nulstilles til `open` med `current_quantity = 0`. Dette virker uanset om mål er nået.

### Ingen andre filer berøres.
