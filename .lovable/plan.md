

## Plan: Beta-lancering — tekster, samtykke med juridisk dokumentation

### Oversigt
Opdaterer beta-banner, forsidetekster, og signup-flow. Gemmer samtykke i databasen med tidsstempel og versioneret tekst, så det kan dokumenteres hvad brugeren accepterede.

### Databaseændring

**Ny tabel: `membership_consents`**
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `consent_text` (text, NOT NULL) — den fulde tekst brugeren accepterede
- `consent_version` (integer, NOT NULL, default 1) — versionsnummer
- `accepted_at` (timestamptz, NOT NULL, default now())

RLS: Brugere kan insertte egne + læse egne. Admins kan læse alle.

### Filer der ændres

**1. `src/components/layout/Header.tsx`** (linje 44-46)
- Beta-banner udvides: "🚧 Beta-version — Gratis i testperioden. Ved 25+ medlemmer afholdes stiftende generalforsamling."

**2. `src/components/home/HeroSection.tsx`**
- Fjern "Bæredygtighed" fra badge (linje 30) — erstat med "Lokalt fællesskab"
- Fjern Leaf-ikonet fra badge, brug kun Users
- Erstat tredje feature-kort (Bæredygtigt, linje 90-98) med forenings-kort: "På vej mod forening — Ved 25+ medlemmer stiftes en forening. Gratis i beta."
- Opdater undertekst (linje 52-54) til at nævne at August dækker driftsudgifter i beta

**3. `src/components/home/SignupBanner.tsx`**
- Opdater teksten til at nævne forening og gratis beta vs. fremtidigt kontingent (allerede delvist gjort linje 28-29, men udvid)

**4. `src/pages/AuthPage.tsx`**
- Tilføj `acceptConsent` state (boolean)
- Tilføj checkbox med samtykketekst (konstant `CONSENT_TEXT_V1`): "Jeg accepterer at blive medlem af den kommende forening Klitmøllers Indkøbsfællesskab. Medlemskab er gratis i beta-perioden, men vil fremadrettet koste et mindre årligt kontingent som dækker platformens drift."
- Validation: checkbox skal være checked før signup
- Efter succesfuld signup: insert i `membership_consents` med `consent_text`, `consent_version: 1`, og brugerens user_id

**5. `src/contexts/AuthContext.tsx`**
- Ingen ændringer — consent gemmes efter signup i AuthPage, ikke i AuthContext

### Tekniske detaljer
- Consent-teksten defineres som en konstant (`CONSENT_TEXT_V1`) i AuthPage, så den nemt kan versioneres
- Consent insertes client-side efter signup returnerer succesfuldt (bruger har nu en session)
- Versionsnummer gør det muligt at spore hvilken version af teksten brugeren accepterede

