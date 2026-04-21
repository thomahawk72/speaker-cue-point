# Speaker Cue Point – Que Signal

Mobilvennlig webapp (Vite + React + Tailwind + Express) som lar brukeren
logge inn med passord og trykke knapper som trigger en n8n-webhook via en
liten Node-backend.

```
browser ──(POST /api/trigger)──> Express (server.js) ──(POST)──> n8n webhook
                                                   └──(JSON)──> browser
```

## Arkitektur

- `src/` – React-klient (Vite)
- `server.js` – Express-server som i produksjon serverer `dist/` og tilbyr
  `POST /api/trigger` som allowlist-proxy mot n8n
- `vite.config.js` – proxier `/api/*` til `http://localhost:3001` i dev

## Lokalt oppsett

1. Installer avhengigheter:

   ```bash
   npm install
   ```

2. Lag `.env` basert på `.env.example` (i prosjektmappen). Lokalt laster
   `server.js` den med `dotenv` (ikke på Scalingo – der brukes kun variabler fra
   plattformen, se under).

   ```bash
   cp .env.example .env
   ```

   Sett minst:

   - `VITE_APP_PASSWORD` – passord klient-siden sjekker mot (byggetid)
   - `N8N_WEBHOOK_URL` – n8n-endepunktet server-siden skal POST-e mot
   - `N8N_AUTH_HEADER` (valgfritt) – hemmelig verdi som n8n Header Auth forventer (samme som i n8n-feltet Value)
   - `N8N_WEBHOOK_AUTH_HEADER_NAME` (valgfritt) – HTTP-header-navn, default `Authorization`; sett f.eks. `N8N_AUTH_HEADER` hvis n8n er konfigurert slik
   - `N8N_TIMEOUT_MS` (valgfritt, default 10000)

3. Kjør dev-modus (Vite + Express samtidig):

   ```bash
   npm run dev
   ```

   - Klient: http://localhost:5173/ (Vite med HMR, proxier `/api` til Express)
   - Server: http://localhost:3001/api/health

## Produksjonsbygg (lokalt)

```bash
npm run build
npm start
```

Serveren lytter da på `PORT` (default 3001) og serverer både statiske filer og
`/api`.

## Deploy til Scalingo

Scalingo bruker Node.js-buildpacket automatisk fordi `package.json` finnes.

Forutsetninger på appen (sett før første deploy):

```bash
scalingo -a <app> env-set VITE_APP_PASSWORD=<passord>
scalingo -a <app> env-set N8N_WEBHOOK_URL=https://<din-n8n>/webhook/...
# valgfritt (må matche n8n Header Auth – navn + verdi):
scalingo -a <app> env-set N8N_WEBHOOK_AUTH_HEADER_NAME=N8N_AUTH_HEADER
scalingo -a <app> env-set N8N_AUTH_HEADER="<samme verdi som i n8n Value>"
scalingo -a <app> env-set NODE_ENV=production
```

Miljø på Scalingo: legg **ikke** ved en `.env`-fil i repoet (den er i `.gitignore`).
Serveren detekterer Scalingo via `SCALINGO_APPLICATION_ID` og leser **aldri**
`.env` fra disk der – alle hemmeligheter settes med `scalingo env-set` eller
dashboard.

Viktig: `VITE_APP_PASSWORD` må være satt **før** deploy, fordi Vite inline-er
den i klient-bundelen under `npm run build`. Endrer du passordet må appen
re-bygges (Scalingo kjører build på hver deploy automatisk).

Deploy:

```bash
git remote add scalingo git@ssh.osc-fr1.scalingo.com:<app>.git
git push scalingo main
```

Scalingo vil da:

1. Kjøre `npm install` (inkl. devDependencies)
2. Kjøre `npm run build` → produserer `dist/`
3. Starte `web`-prosessen fra `Procfile`: `node server.js`
4. Sette `$PORT` som server.js lytter på

### Node-versjon

`package.json` spesifiserer `"engines": { "node": ">=20" }`. Scalingo velger
siste tilgjengelige LTS som matcher.

## Kobling til n8n (knapp → flyt)

1. Bruker trykker **Start** eller **Stopp** i `QueSignal`.
2. Klienten sender `POST /api/trigger` med `{ "action": "cue_start" | "cue_stop" }`.
3. Express videresender til `N8N_WEBHOOK_URL` med valgfri auth-header (se `.env.example`).
4. **JSON til n8n-webhook** (samme felt hver gang):

```json
{
  "action": "cue_start",
  "type": "start",
  "triggeredAt": "2026-04-20T12:34:56.789Z",
  "epoch": 1713616496789
}
```

`type` er `start` eller `stopp` (avledet fra `action`). `epoch` er millisekunder siden Unix epoch (samme tidspunkt som `triggeredAt`).

## API

### `GET /api/health`

```json
{ "ok": true, "n8nConfigured": true }
```

### `POST /api/trigger`

Body (fra nettleseren):

```json
{ "action": "cue_start" }
```

Tillatte `action`-verdier er hardkodet i `server.js` (`ALLOWED_ACTIONS`) for å
unngå at klienten kan sende vilkårlige payloads. Utvid listen når du legger
til nye knapper. Serveren legger til `type`, `triggeredAt` og `epoch` før kallet til n8n (se over).

Responser:

- 200: `{ ok: true, action, status: <n8n-http>, data: <n8n-svar> }`
- 400: ukjent action
- 502: n8n svarte med feil
- 503: `N8N_WEBHOOK_URL` ikke satt
- 504: timeout mot n8n

### Knapp feiler mot n8n (403 / «Authorization data is wrong»)

Da stemmer ikke header-navn eller -verdi mot **Header Auth** i n8n-webhook:

- `N8N_WEBHOOK_AUTH_HEADER_NAME` må være **nøyaktig** det du skrev i feltet **Name** i n8n (f.eks. `N8N_AUTH_HEADER`).
- `N8N_AUTH_HEADER` må være **nøyaktig** det du limte inn i feltet **Value** i n8n (ingen ekstra anførselstegn i Scalingo/`env`-verdien med mindre verdien faktisk skal inneholde dem).
- Sjekk at du bruker **produksjons-URL** for webhook (ikke test) hvis flyten kun er aktiv der.

## Sikkerhetsmerknad

Innloggingen er en enkel klient-side passordsjekk – passordet bakes inn i
bundelen og kan leses av alle som laster siden. Det fungerer som sperre mot
tilfeldig tilgang, men er **ikke** reell autentisering. n8n-URL-en og evt.
Authorization-header holdes derimot skjult fordi de kun finnes på serveren.

Hvis appen skal brukes offentlig bør dette oppgraderes til server-validert
session/cookie-innlogging.
