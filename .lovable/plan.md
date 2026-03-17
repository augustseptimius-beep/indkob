

## Plan: Fix manglende variabler i resend-email funktionen

Kun koderettelse — ingen emails sendes.

### Problem
`resend-email/index.ts` linje 118-149 bygger kun `user_name`, `user_email`, `product_title`, `product_description`, `price_per_unit`, `unit_name`, `target_quantity`. Den mangler:
- `quantity`, `total_price` (fra `reservations`)
- `mobilepay_number` (fra `cms_content`)
- `current_quantity`, `remaining_quantity`, `minimum_purchase`, `reservation_count` (fra `products`/`reservations`)
- `paid_at`
- `items_table`, `item_count`, `total_sum` (batch-skabeloner)

### Ændring
**Fil: `supabase/functions/resend-email/index.ts`** — udvid variabel-opbygningen (linje 118-153):

1. **Reservation lookup**: Hvis `logEntry.user_id` + `logEntry.product_id` begge findes, hent reservation og beregn `quantity` og `total_price`
2. **CMS lookup**: Hent `mobilepay_number` fra `cms_content` (key: `payment_info`)
3. **Produkt-variabler**: Tilføj `current_quantity`, `remaining_quantity`, `minimum_purchase`, `reservation_count`
4. **Batch-skabeloner**: Hvis `template_key === 'batch_reservation_confirmed'`, hent alle reservationer med `batch_id` + `user_id` og byg `items_table`, `item_count`, `total_sum`
5. **Øvrige**: `paid_at` sættes til `new Date().toLocaleDateString('da-DK')`

Derefter deploy edge function. Ingen emails sendes — det er kun en koderettelse der sikrer at fremtidige manuelle gensendelser udfylder alle variabler korrekt.

