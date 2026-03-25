

## Fejlfinding: Ordre- og reservationshåndtering

### Fundne problemer

**Problem 1 — Død trigger: `notify_on_product_status_change`**
Triggeren `on_product_status_change` (AFTER UPDATE on products) er funktionelt død. Den kræver `NEW.status = 'ordered' AND OLD.status = 'open'`, men `reset_product_quantity_on_order` (BEFORE UPDATE) nulstiller `NEW.status` tilbage til `'open'` inden AFTER-triggeren kører. Den kan aldrig aktiveres og bør fjernes.

**Problem 2 — Manglende `batch_id` i Reservation-typen**
`src/lib/supabase-types.ts` definerer `Reservation` uden `batch_id`-feltet. `CartSidebar.tsx` bruger `batch_id` korrekt i databaseoperationer (via den auto-genererede Supabase-type), men den lokale `Reservation`-type er ufuldstændig. Dette kan give TypeScript-fejl i andre filer der bruger typen.

**Problem 3 — `ProductStatus` type inkluderer `'arrived'`**
`src/lib/supabase-types.ts` linje 2 definerer `ProductStatus = 'open' | 'ordered' | 'arrived'`. Men `'arrived'` bruges aldrig i systemet — produkter går fra `ordered` → `open` (via BEFORE-trigger). Typen bør kun være `'open' | 'ordered'`.

**Ingen øvrige fejl fundet:**
- Kurv → reservation flowet er korrekt (CartContext → CartSidebar → DB insert med batch_id)
- Admin ordre-sektioner (klar til bestilling, bestilte batches, klar til afhentning, afventende) fungerer korrekt
- MyPage viser reservationer korrekt grupperet efter status
- `markBatchAsArrived` kalder edge-funktionen med JWT og admin-tjek virker nu (efter forrige fix)
- `markProductAsOrdered` opdaterer korrekt via `useUpdateProduct`
- `markReservationAsCompleted` blokerer korrekt ubetalte reservationer i UI
- Realtime subscriptions er korrekt sat op for både products og reservations
- RLS-policies er konsistente og korrekte

### Plan

1. **Fjern den døde trigger `notify_on_product_status_change`** via migration — drop triggeren og funktionen
2. **Tilføj `batch_id` til `Reservation`-typen** i `src/lib/supabase-types.ts`
3. **Fjern `'arrived'` fra `ProductStatus`** — opdater til `'open' | 'ordered'`

### Tekniske detaljer

**Migration SQL:**
```sql
DROP TRIGGER IF EXISTS on_product_status_change ON public.products;
DROP FUNCTION IF EXISTS public.notify_on_product_status_change();
```

**src/lib/supabase-types.ts:**
- Linje 2: `ProductStatus = 'open' | 'ordered'` (fjern `'arrived'`)
- Linje 61-72: Tilføj `batch_id: string | null;` til `Reservation`-interface

