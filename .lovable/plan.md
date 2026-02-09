

# Produktets livscyklus: Fra lineaer til cirkulaer

## Problemet i dag

Systemet behandler produkter som om de har et lineaert liv: open -> ordered -> arrived -> completed. Men i virkeligheden er produkter **permanente** - de korer i cyklusser. Nar et produkt nar sit mal, og admin bestiller hjem, skal det abne igen for nye reservationer.

**Nuvaerende flow (forkert):**

```text
open --> ordered --> arrived --> completed (slut)
```

**Korrekt flow:**

```text
       +----> mal naet (last) ----> admin bestiller hjem +
       |                                                  |
       +------ open (modtager reservationer) <------------+
               current_quantity nulstilles
```

Produktet lever for evigt. Det skifter mellem at vaere abent for nye reservationer og midlertidigt last (nar malet er naet, mens admin bestiller).

---

## Hvad skal aendres

### 1. Database: Opdater trigger til at genabne produktet

Den eksisterende trigger `reset_quantity_on_order` nulstiller allerede `current_quantity` nar admin markerer "bestilt hjem". Den skal ogsa saette status tilbage til `open`, sa produktet straks abner for nye reservationer.

Derudover skal triggeren markere alle `pending` reservationer for produktet som `ordered`, sa admin kan spore den bestilte batch via reservationer i stedet for via produktstatus.

### 2. Admin Ordrer: Sporingslogik flyttes fra produkt til reservationer

I dag grupperer AdminOrders efter **produktstatus** (ordered, arrived). Da produktet nu gar direkte tilbage til `open`, skal admin i stedet se **reservations-batches**:

- **"Klar til bestilling"** - produkter der er `open` med `current_quantity >= target_quantity` (uaendret)
- **"Bestilte batches"** - reservationer med status `ordered` (grupperet pr. produkt). Admin kan markere en batch som "ankommet" (saetter reservationer til `ready`)
- **"Ankomne batches"** - reservationer med status `ready`. Viser betalingsstatus
- **"Afventende betalinger"** - ubetalte reservationer (uaendret)

### 3. Fjern `completed` fra produktstatus

Da produkter aldrig "afsluttes", fjernes `completed` som produktstatus fra:
- `supabase-types.ts` (ProductStatus type)
- `ProductFormDialog.tsx` (status dropdown)
- `ProductCard.tsx` (status labels/styling)
- `ProductDetailPage.tsx` (status badge)
- `AdminProducts.tsx` (status badge)
- `AdminOrders.tsx` (status config)

Reservationer kan stadig have status `completed` (nar en bruger har afhentet sin vare).

### 4. Produktsiden: Opdater "Vis afsluttede" toggle

Da produkter ikke laengere kan vaere `completed`, omdobes toglen til "Vis alle" eller fjernes helt, da alle produkter nu altid er `open`. Filtreringen tilpasses sa den evt. skjuler produkter der midlertidigt er last (target naet, afventer admin).

### 5. Produktdetaljesiden: Korrekt besked ved target naet

Nar `current_quantity >= target_quantity`, vises en besked som "Malet er naet - afventer bestilling hos leverandor" i stedet for blot at skjule reservationsknappen. Brugeren skal forsta at produktet abner igen snart.

### 6. Min Side: Vis korrekt status pa reservationer

Reservation-status labels opdateres til at afspejle den nye flow:
- `pending` -> "Afventer flere kobere" (uaendret)
- `ordered` -> "Bestilt hjem" (uaendret)
- `ready` -> "Klar til afhentning" (uaendret)
- `completed` -> "Afhentet" (uaendret)

---

## Tekniske detaljer

### Database migration

```sql
-- Opdater trigger: nar status saettes til 'ordered', 
-- marker alle pending reservationer som 'ordered',
-- nulstil quantity, og saet status tilbage til 'open'
CREATE OR REPLACE FUNCTION public.reset_product_quantity_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'ordered' AND OLD.status != 'ordered' THEN
    -- Marker alle pending reservationer for dette produkt som ordered
    UPDATE reservations 
    SET status = 'ordered', updated_at = now()
    WHERE product_id = NEW.id AND status = 'pending';
    
    -- Nulstil quantity og saet tilbage til open
    NEW.current_quantity := 0;
    NEW.status := 'open';
  END IF;
  RETURN NEW;
END;
$$;
```

### AdminOrders refaktorering

- Erstat produkt-baserede sektioner ("Bestilte produkter", "Ankomne produkter") med reservations-baserede sektioner
- Grupper `ordered` reservationer pr. produkt, sa admin kan markere hele batchen som "ankommet"
- Grupper `ready` reservationer pr. produkt med betalingsoverblik
- Behold "Klar til bestilling" sektionen (baseret pa produkter med target naet)

### Filer der aendres

| Fil | AEndring |
|-----|---------|
| `supabase/migrations/` (ny) | Opdateret trigger + fjern 'completed' status |
| `src/lib/supabase-types.ts` | Fjern 'completed' fra ProductStatus |
| `src/components/admin/AdminOrders.tsx` | Refaktorer til reservations-baseret sporingsflow |
| `src/components/admin/AdminProducts.tsx` | Fjern 'completed' fra status badges |
| `src/components/admin/ProductFormDialog.tsx` | Fjern 'completed' fra status dropdown |
| `src/components/products/ProductCard.tsx` | Fjern 'completed' status, tilfoej "mal naet" visning |
| `src/pages/ProductDetailPage.tsx` | Tilfoej besked ved target naet, fjern 'completed' |
| `src/pages/ProductsPage.tsx` | Opdater/fjern "Vis afsluttede" toggle |
| `src/hooks/useReservations.ts` | Tilfoej mutation til batch-opdatering af reservationer |

