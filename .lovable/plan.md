

## Plan: Forbedret Brugeradministration

### Oversigt
Opgraderer AdminUsers-komponenten med tre hovedelementer: bruger-vækst graf, søgefunktion, og mulighed for at slette brugere.

### Hvad der bygges

**1. Statistik-kort og vækstgraf (recharts)**
- Kort der viser: Totalt antal brugere, nye denne måned, antal admins
- Linjegraf der viser bruger-tilgang over tid (baseret på `profiles.created_at`)
- Data grupperes pr. uge/måned afhængig af antal brugere

**2. Søgning og filtrering**
- Søgefelt der filtrerer på navn (client-side fra allerede hentet data)
- Filter-mulighed for rolle (alle / admin / medlem)
- Tabelvisning i stedet for kort-layout for bedre overblik ved mange brugere

**3. Sletning af brugere**
- Slet-knap pr. bruger med bekræftelsesdialog
- Sletningen fjerner brugerens profil, reservationer, wishlist, roller og kommentarer via klient-side kaskade (samme mønster som DeleteAccountSection)
- Auth-brugeren kan ikke slettes fra klienten (kræver service role), men alle public-data ryddes
- Admin kan ikke slette sig selv

### Tekniske detaljer

**Filer der ændres:**
- `src/components/admin/AdminUsers.tsx` - komplet omskrivning med de tre features

**Ingen databaseændringer** - alt data hentes fra eksisterende `profiles` og `user_roles` tabeller. Grafen beregnes client-side ud fra `created_at` timestamps.

**Afhængigheder** - bruger eksisterende `recharts`, `lucide-react`, shadcn-komponenter (Table, Input, Select, AlertDialog).

