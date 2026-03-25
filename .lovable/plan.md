

## Fejlfinding: E-mails og triggere — Fund og rettelser

### Fundne problemer

**Problem 1 — KRITISK: Admin-tjek fejler i "Klar til afhentning"**
Når admin klikker "Marker som ankommet" i ordresektionen, verificerer edge-funktionen admin-rollen via `has_role()`. Men `has_role()` tjekker `auth.uid()`, som er `null` når den kaldes fra edge-funktionens service-role klient. Resultatet er, at admin-tjekket **altid fejler med 403 Forbidden** fra admin UI'et. Emails der blev sendt tidligere virkede kun fordi de brugte HMAC-signatur (script), som springer admin-tjekket over.

**Problem 2 — Manglende labels i email-loggen**
`AdminEmailLog.tsx` mangler danske labels for flere notifikationstyper:
- `payment_confirmed` → "Betaling bekræftet"
- `product_almost_reached` → "Produkt næsten i mål"
- `batch_reservation_confirmed` → "Batchreservation bekræftet"

Disse vises som rå engelske nøgler i loggen.

**Problem 3 — Triggere eksisterer og virker**
Alle 11 database-triggere er korrekt tilknyttet og aktive. Ingen manglende triggere.

**Problem 4 — Email-skabeloner er i orden**
9 aktive skabeloner, `product_arrived` er korrekt slettet. `ready_for_pickup` eksisterer og er aktiv.

### Plan

1. **Fix admin-tjek i edge-funktionen** — Erstat `supabase.rpc("has_role")` med en direkte query til `user_roles`-tabellen via service-role klienten. Dette virker fordi service-role klienten bypasser RLS.

2. **Tilføj manglende labels i AdminEmailLog** — Tilføj de 3 manglende notifikationstype-labels.

3. **Deploy edge-funktionen** — Så rettelsen træder i kraft.

### Tekniske detaljer

**Edge function** (`send-notification/index.ts`, linje 1251-1258):
```typescript
// FRA (fejler altid med service role):
const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: authenticatedUserId, _role: "admin" });

// TIL (direkte query der virker med service role):
const { data: adminRole } = await supabase
  .from("user_roles")
  .select("id")
  .eq("user_id", authenticatedUserId)
  .eq("role", "admin")
  .maybeSingle();
if (!adminRole) { return 403 }
```

**AdminEmailLog.tsx** (linje 34-42):
Tilføj labels: `payment_confirmed`, `product_almost_reached`, `batch_reservation_confirmed`

