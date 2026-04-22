# Speaker Cue Point – Backend API

Dette dokumentet beskriver det **offentlige HTTP-grensesnittet** til Speaker Cue Point-backend (Express på Scalingo eller lokalt). Det er dette andre tjenester og klienter skal forholde seg til.

**Merk om ansvarslinjer i kodebasen:** Backend tar imot signalet, utvider det med bl.a. **epoch** og **type**, og videresender til en **intern** utgående integrasjon (miljøvariabel `N8N_WEBHOOK_URL`). Selve **lagring**, **deduplisering** og **forretningsregler** for historikk ligger **ikke** i `server.js` i dette repoet – de håndteres i det systemet backend kaller videre. Integratorer trenger **ikke** å kjenne til den kjeden; bruk kun API-et under.

---

## Oversikt

```
Annen tjeneste / nettleser  ──HTTPS──►  Speaker Cue Point (Scalingo)
                                           │
                                           └── intern videreføring (konfigureres på server)
```

- Klienten kaller `**POST /api/trigger**` med `cue_start` eller `cue_stop`.
- Serveren legger på metadata (bl.a. **epoch** i millisekunder, **type** `start`/`stopp`, **triggeredAt**).
- Hemmeligheter for utgående kall finnes **kun** på serveren.

---

## Base-URL


| Miljø                        | Eksempel                                                       |
| ---------------------------- | -------------------------------------------------------------- |
| Produksjon (Scalingo)        | `https://<app-navn>.scalingo.io` eller eget domene             |
| Lokalt (backend direkte)     | `http://localhost:3001`                                        |
| Lokalt (via Vite dev-server) | `http://localhost:5173` med sti `/api/...` (proxy til backend) |


Alle stier under er relative til base-URL (f.eks. `https://min-app.scalingo.io/api/trigger`).

---

## `GET /api/health`

Sjekker at prosessen kjører og om utgående integrasjon er konfigurert på serveren.

**Svar 200**

```json
{
  "ok": true,
  "n8nConfigured": true
}
```


| Felt            | Beskrivelse                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`            | Alltid `true` når svaret er 200.                                                                                                                           |
| `n8nConfigured` | `true` når miljøvariabelen for utgående webhook-URL er satt på serveren; `false` betyr at `POST /api/trigger` vil svare **503** inntil det er konfigurert. |


**curl**

```bash
curl -sS https://<din-app>/api/health
```

---

## `POST /api/trigger`

Sender et cue-signal inn i systemet. Backend utleder tid og type og videresender til intern pipeline.

### Forespørsel

**Headers**


| Header         | Verdi              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |


**Body (JSON)**


| Felt        | Type                  | Påkrevd | Beskrivelse                                                                                                                                                                                                                                             |
| ----------- | --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action`    | string                | ja      | `cue_start`, `cue_stop`                                                                                                                                                                                                                                 |
| `pressedAt` | tall eller ISO-streng | ja      | Tidspunktet brukeren **trykket** (ikke når forespørselen sendes). Tall = millisekunder siden Unix epoch (samme som JavaScript `Date.now()`). Alternativt ISO-8601-streng. Backend oversetter til `epoch` og `triggeredAt` (UTC) mot intern integrasjon. |


```json
{ "action": "cue_start", "pressedAt": 1713616496789 }
```

```json
{ "action": "cue_stop", "pressedAt": "2026-04-20T12:34:56.789Z" }
```

- Ugyldig eller manglende `pressedAt` gir **400** (`invalid_pressed_at`).
- Ugyldig `action` gir **400** (`unknown_action`).

### Suksess **200**

Backend har mottatt forespørselen og utgående kall til intern integrasjon har returnert OK.

```json
{
  "ok": true,
  "action": "cue_start",
  "status": 200,
  "data": {}
}
```


| Felt     | Beskrivelse                                                                         |
| -------- | ----------------------------------------------------------------------------------- |
| `ok`     | `true`                                                                              |
| `action` | Samme som i forespørselen                                                           |
| `status` | HTTP-status fra utgående svar                                                       |
| `data`   | Tolkt JSON fra utgående svar, eller `{ "raw": "<tekst>" }` hvis svaret ikke er JSON |


### Feil


| HTTP | `error` (typisk)     | Forklaring                                                          |
| ---- | -------------------- | ------------------------------------------------------------------- |
| 400  | `unknown_action`     | Ugyldig eller manglende `action`                                    |
| 400  | `invalid_pressed_at` | Manglende eller ugyldig `pressedAt`                                 |
| 502  | `n8n_error`          | Utgående integrasjon returnerte ikke suksess; se `status` og `data` |
| 503  | `n8n_not_configured` | Utgående webhook-URL er ikke satt på serveren                       |
| 504  | `n8n_timeout`        | Timeout mot utgående tjeneste (`N8N_TIMEOUT_MS`, standard 10 s)     |
| 502  | `n8n_unreachable`    | Nettverks-/DNS-feil mot utgående tjeneste                           |


*(Feilkode-navn som starter med `n8n_` er historiske fra implementasjonen; det beskriver fortsatt den utgående integrasjonen.)*

### curl

```bash
curl -sS -X POST 'https://<din-app>/api/trigger' \
  -H 'Content-Type: application/json' \
  -d '{"action":"cue_start","pressedAt":1713616496789}'
```

---

## Integrasjon for nye klienter


| Forutsetning    | Beskrivelse                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base-URL        | Deployet Speaker Cue Point-instans (f.eks. Scalingo).                                                                                                                                 |
| Transport       | HTTPS anbefales i produksjon.                                                                                                                                                         |
| Kontrakt        | JSON-body med `action` og `pressedAt` (se over); ingen API-nøkkel i URL i standardoppsett.                                                                                            |
| Sikkerhet       | Endepunktet er **åpent** for alle som kan nå URL-en (ingen innebygd API-nøkkel på `/api/trigger`). Begrens med nettverk, IP-tillatelser, eller innfør API-nøkkel i backend ved behov. |
| Nye signaltyper | Krever endring av `ALLOWED_ACTIONS` i `server.js` (og vanligvis UI) – ikke bare konfigurasjon.                                                                                        |


---

## Felter klient vs. videreføring (kun for forståelse)


| Opprinnelse                            | Felt                  | Beskrivelse                                              |
| -------------------------------------- | --------------------- | -------------------------------------------------------- |
| Klient sender                          | `action`, `pressedAt` | Se tabell over.                                          |
| Backend utleder til intern integrasjon | `type`                | `start` ved `cue_start`, `stopp` ved `cue_stop`.         |
| Backend utleder                        | `epoch`               | Millisekunder fra `pressedAt` (avrundet hvis nødvendig). |
| Backend utleder                        | `triggeredAt`         | ISO 8601 (UTC) som tilsvarer `epoch`.                    |


---

## Versjon og kilde

Tillatte `action`-verdier og payload-logikk er definert i `server.js`. Ved avvik mellom dette dokumentet og koden gjelder **koden**.