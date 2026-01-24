
# Plan: Automatisk Vault Setup via Edge Function

## Baggrund
Database-triggeren `notify_on_product_status_change` har brug for adgang til signeringsnøglen (`edge_function_signing_key`) fra Supabase Vault for at kunne signere HTTP-anmodninger til edge funktionen. Du har allerede tilføjet `EDGE_FUNCTION_SIGNING_KEY` som en secret, men den er kun tilgængelig som environment-variabel for edge functions - ikke i Vault.

## Løsning
Jeg opretter en **engangs-setup edge function** kaldet `sync-signing-key` som:
1. Læser `EDGE_FUNCTION_SIGNING_KEY` fra environment-variablerne
2. Bruger service role key til at indsætte værdien i Supabase Vault
3. Kan kun kaldes af administratorer (kræver valid auth token med admin rolle)

## Implementeringsplan

### Trin 1: Opret ny edge function `sync-signing-key`
- Fil: `supabase/functions/sync-signing-key/index.ts`
- Funktionen læser signeringsnøglen fra `Deno.env.get("EDGE_FUNCTION_SIGNING_KEY")`
- Bruger `SUPABASE_SERVICE_ROLE_KEY` til at indsætte i vault via SQL
- Kræver admin-authentication for at kunne køres
- Returnerer success/error status

### Trin 2: Opdater supabase/config.toml
- Tilføj konfiguration for den nye funktion
- Sæt `verify_jwt = false` (vi validerer manuelt i koden)

### Trin 3: Kør funktionen én gang
- Efter deploy kan du kalde funktionen fra admin-panelet eller via curl
- Når nøglen er synkroniseret til Vault, vil email-notifikationer fungere

## Tekniske detaljer

```text
┌─────────────────────────┐
│  EDGE_FUNCTION_SIGNING  │
│  _KEY (env variable)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  sync-signing-key       │
│  Edge Function          │
│  (kør én gang)          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  vault.secrets          │
│  (database)             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Database Trigger       │
│  (kan nu signere)       │
└─────────────────────────┘
```

## Filer der oprettes/ændres

| Fil | Handling |
|-----|----------|
| `supabase/functions/sync-signing-key/index.ts` | Ny fil - edge function |
| `supabase/config.toml` | Opdater - tilføj funktion |

## Efter implementering
1. Funktionen deployes automatisk
2. Du (som admin) kører funktionen én gang
3. Signeringsnøglen kopieres til Vault
4. Email-notifikationer vil nu fungere når produktstatus ændres
