

## Email-log detaljevisning med PDF-eksport

### Hvad vi bygger
1. **Lightbox/dialog** — Klik på en email-række i loggen for at åbne en detaljeret visning med alle metadata-felter
2. **PDF-download** — Knap i dialogen der genererer en PDF med alle relevante metadata som dokumentation

### Begrænsning
Email-loggen gemmer ikke det renderede HTML-indhold. Dialogen viser derfor metadata (tidspunkt, modtager, emne, type, status, fejlbesked, template-nøgle, produkt-ID, bruger-ID) — ikke selve email-kroppen. Dette er tilstrækkeligt som dokumentation for afsendelsestidspunkt og leveringsstatus.

### Plan

**1. Installer jspdf**
Tilføj `jspdf` som dependency til PDF-generering i browseren.

**2. Opret `EmailLogDetailDialog.tsx`**
Ny komponent med:
- Dialog/lightbox der viser alle felter fra email-loggen i et struktureret layout
- Metadata-sektion: Afsendelsestidspunkt, modtager (navn + email), emne, notifikationstype (dansk label), status (med farveindikator), fejlbesked (hvis relevant), template-nøgle, produkt-ID, bruger-ID, log-ID
- "Download PDF"-knap der genererer en PDF med jspdf indeholdende:
  - Header med "Email-dokumentation"
  - Alle metadata-felter pænt formateret
  - Genereringsdato i bunden
- "Gensend"-knap (hvis failed + har template_key)

**3. Opdater `AdminEmailLog.tsx`**
- Tilføj state for valgt email-log
- Gør tabelrækker klikbare (cursor-pointer, hover-effekt)
- Render `EmailLogDetailDialog` med den valgte log

### Tekniske detaljer
- PDF genereres med `jspdf` — ren client-side, ingen server-kald
- Dialogen bruger eksisterende `Dialog` UI-komponent
- Alle datoer formateres på dansk med `date-fns/locale/da`

