

## Admin Dashboard-forside

### Hvad vi bygger
En ny "Dashboard"-fane som standard startside i admin, der giver et hurtigt overblik med statistikkort og top-produkter.

### Data vi kan hente (alle fra eksisterende tabeller)

1. **Antal brugere** — `profiles` count
2. **Samlet "solgt" (kr)** — sum af `reservations.quantity * products.price_per_unit` for betalte reservationer
3. **Samlet besparelse (kr)** — sum af `(products.comparison_price - products.price_per_unit) * reservations.quantity` for betalte reservationer hvor `comparison_price` findes
4. **Aktive reservationer** — count af reservationer med status pending/ordered/ready
5. **Ubetalte ordrer** — allerede tilgængelig
6. **Mest populære produkter** — top 5 produkter sorteret efter antal reservationer (sum af quantity)
7. **Seneste aktivitet** — seneste 5 reservationer med bruger og produkt

### Plan

**1. Opret `AdminDashboard.tsx`**
- 4 statistikkort i grid (Brugere, Solgt for, Besparelse, Aktive reservationer)
- Sektion med "Top 5 produkter" — tabel med produktnavn, antal reserveret, omsætning
- Sektion med "Seneste aktivitet" — kompakt liste med de nyeste reservationer
- Alle data hentes via separate `useQuery` kald direkte i komponenten

**2. Opdater `AdminPage.tsx`**
- Tilføj 'dashboard' til navItems som første element med `LayoutDashboard` ikon
- Sæt default `activeTab` til `'dashboard'`
- Tilføj case i `renderContent()`

### Tekniske detaljer

Statistik-queries:
```typescript
// Brugere
supabase.from('profiles').select('*', { count: 'exact', head: true })

// Solgt + besparelse: hent alle betalte reservationer med produkt-join
supabase.from('reservations')
  .select('quantity, product:products(price_per_unit, comparison_price)')
  .eq('paid', true)
// Beregn summeringer client-side

// Top produkter: hent alle reservationer grupperet
supabase.from('reservations')
  .select('product_id, quantity, product:products(title, price_per_unit, image_url)')
  .in('status', ['pending','ordered','ready','completed'])
// Aggregér client-side til top 5
```

Komponenten bruger eksisterende `Card`, `Badge`, `Skeleton` UI-komponenter og `recharts` er ikke nødvendig — simple tal-kort og en tabel er tilstrækkeligt for et hurtigt overblik.

