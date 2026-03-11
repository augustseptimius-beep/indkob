

# Kurv-sidebar til reservationer

## Overblik

Nuværende flow: Klik "Reserver" → direkte DB-insert → bekræftelsesdialog per produkt.

Nyt flow: Klik "Læg i kurv" → produkt tilføjes til client-side kurv → sidebar åbner fra højre → bruger bekræfter alle varer samlet → individuelle reservationer oprettes i DB → én samlet bekræftelsesmail.

Backend forbliver uændret: hver reservation er sin egen post. Kurven er udelukkende en frontend-mekanisme.

## Ændringer

### 1. Cart Context (`src/contexts/CartContext.tsx`)

React context med state for kurv-items:
- `items: Array<{ productId, product, quantity }>` — client-side liste
- `addItem(product, quantity)` — tilføj eller opdater mængde
- `removeItem(productId)` — fjern fra kurv
- `updateQuantity(productId, quantity)` — juster antal
- `clearCart()` — tøm kurv
- `isOpen` / `setIsOpen` — styr sidebar-visibility
- `itemCount` — total antal unikke produkter

Wrappe `App` med `CartProvider`.

### 2. Cart Sidebar (`src/components/cart/CartSidebar.tsx`)

Sheet-komponent (fra højre) der viser kurvens indhold:
- Liste over tilføjede produkter med billede, titel, antal, pris
- Juster antal eller fjern per produkt
- Samlet beløb nederst
- "Bekræft reservationer"-knap → kalder `useCreateReservation` for hvert item sekventielt
- Ved succes: tøm kurv, vis bekræftelsesdialog med samlet oversigt
- Kræver login for at bekræfte (vis login-knap hvis ikke logget ind)

### 3. Opdater ProductDetailPage

- Knappen ændres fra "Reserver" til "Læg i kurv"
- Ved klik: tilføj til cart context, åbn sidebar
- Fjern `ReservationConfirmDialog` herfra (flyttes til sidebar-flowet)

### 4. Opdater Header

- Erstat/supplér ShoppingBag-ikonet så det også viser kurv-antal (cart items, ikke reservationer)
- Klik åbner CartSidebar
- Behold eksisterende "Min side"-badge for aktive reservationer

### 5. Bekræftelsesdialog (`src/components/cart/CartConfirmDialog.tsx`)

Samlet bekræftelsesdialog efter alle reservationer er oprettet:
- Viser liste over alle bekræftede produkter med antal og pris
- Samlet beløb
- "Se mine reservationer" / "Fortsæt med at handle"

### 6. Samlet bekræftelsesmail

Opdater `send-notification` edge function til at håndtere en ny type `batch_reservation_confirmed`:
- Modtager liste af reservation-IDs
- Bygger én mail med alle produkter, antal og priser i en tabel
- Sender til brugerens email

Kald dette fra frontend efter alle reservationer er oprettet (via `supabase.functions.invoke`), eller tilføj et lille endpoint der tager en liste af reservation-IDs.

### 7. Undgå individuelle mails ved batch

Nuværende DB-trigger `notify_on_reservation_change` sender mail per reservation. For at undgå N individuelle mails under batch:
- Tilføj en `silent` boolean-kolonne (default false) til reservations, eller
- Brug en flag i cart-flowet: efter batch-insert, kald én samlet notification, og lad triggeren tjekke om det er en batch (enklere: deaktiver trigger midlertidigt er ikke muligt via client)
- **Anbefalet**: Tilføj `batch_id` (nullable uuid) kolonne til reservations. Triggeren skipper notification hvis `batch_id IS NOT NULL`. Frontend sender derefter ét kald til `send-notification` med batch_id for samlet mail.

## Teknisk arkitektur

```text
ProductDetailPage
  └─ "Læg i kurv" → CartContext.addItem()
                       └─ CartSidebar åbner (Sheet right)
                            ├─ Vis items, juster antal
                            └─ "Bekræft" → loop createReservation (med batch_id)
                                              └─ send-notification({ type: 'batch_reservation_confirmed', batch_id })
                                                    └─ Én