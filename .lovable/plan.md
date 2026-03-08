

# Forbered backend til Stripe-integration

## Overblik

Platformen bruger i dag manuel MobilePay-betaling. Vi forbereder databasen og en edge function-stub så Stripe kan tilkobles senere uden at ændre eksisterende tabeller.

## Ændringer

### 1. Database: `payments`-tabel

Ny tabel til at tracke Stripe-betalinger, adskilt fra `reservations.paid`-feltet:

- `id` (uuid, PK)
- `reservation_id` (uuid, FK → reservations)
- `user_id` (uuid, not null)
- `amount` (numeric, not null) — beløb i DKK
- `currency` (text, default 'dkk')
- `stripe_payment_intent_id` (text, nullable) — Stripe PI reference
- `stripe_checkout_session_id` (text, nullable)
- `status` (text: 'pending' | 'succeeded' | 'failed' | 'refunded', default 'pending')
- `created_at`, `updated_at`

RLS: Brugere kan se egne, admins kan se alle. Insert via service role (edge function).

### 2. Database: `stripe_config`-tabel (nøgle-værdi)

Til at gemme Stripe-relaterede indstillinger (webhook secret key reference, etc.):

- `key` (text, PK)
- `value` (text)
- `updated_at`

RLS: Kun admin SELECT/UPDATE.

### 3. Edge function stub: `stripe-webhook`

En tom edge function klar til at modtage Stripe webhooks:
- CORS headers
- Signature-verifikation placeholder
- Handler for `checkout.session.completed` og `payment_intent.succeeded`
- Opdaterer `payments`-tabellen og sætter `reservations.paid = true`

### 4. Edge function stub: `create-checkout`

En stub til at oprette Stripe Checkout sessions:
- Modtager `reservation_id`
- Slår reservation + produkt op
- Returnerer placeholder-response (Stripe SDK tilføjes senere)

### 5. Config

Tilføj begge edge functions til `supabase/config.toml` med `verify_jwt = false`.

## Hvad der IKKE gøres

- Stripe SDK installeres ikke
- Ingen Stripe API-kald
- Ingen UI-ændringer
- Ingen Stripe-konto nødvendig

Når du har en Stripe-konto, kan vi aktivere Stripe-integrationen og koble det hele sammen.

