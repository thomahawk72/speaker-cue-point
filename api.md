# Speaker Cue Point – Backend API

Dette dokumentet beskriver det **offentlige HTTP-grensesnittet** til Speaker Cue Point.

## Oversikt

```
Klient ── HTTPS ──►  Speaker Cue Point API
```

- Klienten kaller `POST /api/trigger` med JSON-body som minst inneholder `action` (`cue_start` | `cue_stop`) og `**pressedAt**` – tidspunktet brukeren utløste handlingen (se under).

---

## Base-URL


| Miljø                    | URL                                           |
| ------------------------ | -------------------------------------------------- |
| Produksjon (Scalingo)    | https://que-signal.osc-fr1.scalingo.io/ |


Alle stier under er relative til base-URL.

---

## `GET /api/health`

Sjekker at prosessen kjører og om utgående integrasjon er konfigurert på serveren.

**Svar 200**

```json
{
  "ok": true,
  "n8nConfigured": true,
  "triggerAuthRequired": true
}
```


| Felt                  | Beskrivelse                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`                  | Alltid `true` når svaret er 200.                                                                                                                           |
| `n8nConfigured`       | `true` når miljøvariabelen for utgående webhook-URL er satt på serveren; `false` betyr at `POST /api/trigger` vil svare **503** inntil det er konfigurert. |
| `triggerAuthRequired` | `true` når miljøvariabelen **`TRIGGER_API_KEY`** er satt på serveren – da må `POST /api/trigger` inkludere header **`X-API-Key`** med samme verdi (se under). |


**curl**

```bash
curl -sS https://<base-url>/api/health
```

---

## `POST /api/trigger`

Sender et cue-signal inn i systemet.

### Forespørsel

**Headers**


| Header           | Verdi                                                             |
| ---------------- | ----------------------------------------------------------------- |
| `Content-Type`   | `application/json`                                                |
| `X-API-Key`      | Påkrevd når serveren har `TRIGGER_API_KEY` satt – samme hemmelighet som i miljøvariabelen. |

### API-nøkkel (`TRIGGER_API_KEY` / `X-API-Key`)

Når **`TRIGGER_API_KEY`** er satt på backend (Scalingo miljø / `.env`), avvises `POST /api/trigger` uten gyldig header med **401** (`error`: `unauthorized`). Sammenligningen skjer med konstant tid (`lib/timingSafeEqual.js`).

Når **`TRIGGER_API_KEY` ikke er satt**, kreves ingen `X-API-Key` (åpent endepunkt); server logger da en advarsel ved oppstart.

**Speaker Cue Point-webappen** sender nøkkelen fra **`VITE_TRIGGER_API_KEY`** (samme verdi som `TRIGGER_API_KEY`), inlined ved Vite-build – på linje med `VITE_APP_PASSWORD`. Eksterne klienter sender `X-API-Key` i HTTP-header (se curl under).

**Eksempel feilsvar 401**

```json
{
  "ok": false,
  "error": "unauthorized",
  "message": "Manglende eller ugyldig API-nøkkel. Send header X-API-Key som matcher TRIGGER_API_KEY på serveren."
}
```


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

### Validering av `pressedAt`

Implementert i `lib/parsePressedAt.js` (også dekket av `npm test`):


| Innkommende `pressedAt`                                           | Resultat                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| Endelig **tall**                                                  | Avrundes til nærmeste heltall ms og brukes som `epoch`. |
| Ikke-tom **streng** som `Date.parse()` forstår (f.eks. ISO 8601)  | Tolkes til ms og brukes som `epoch`.                    |
| Mangler, `null`, `NaN`, `±Infinity`, ugyldig streng, objekt, osv. | **400** `invalid_pressed_at`                            |


Serverens feilmelding i body (felt `message`) kan brukes i klient; typisk tekst ved `invalid_pressed_at`: at `pressedAt` må være millisekunder (tall) eller ISO-8601-streng.

**Eksempel feilsvar 400**

```json
{
  "ok": false,
  "error": "invalid_pressed_at",
  "message": "pressedAt mangler eller er ugyldig. Send millisekunder siden Unix epoch (tall) eller ISO-8601-streng."
}
```

```json
{
  "ok": false,
  "error": "unknown_action",
  "message": "Ukjent action. Tillatt: cue_start, cue_stop"
}
```

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
| 401  | `unauthorized`       | Manglende eller feil `X-API-Key` når `TRIGGER_API_KEY` er satt       |
| 400  | `unknown_action`     | Ugyldig eller manglende `action`                                    |
| 400  | `invalid_pressed_at` | Manglende eller ugyldig `pressedAt`                                 |
| 502  | `n8n_error`          | Utgående integrasjon returnerte ikke suksess; se `status` og `data` |
| 503  | `n8n_not_configured` | Utgående webhook-URL er ikke satt på serveren                       |
| 504  | `n8n_timeout`        | Timeout mot utgående tjeneste (`N8N_TIMEOUT_MS`, standard 10 s)     |
| 502  | `n8n_unreachable`    | Nettverks-/DNS-feil mot utgående tjeneste                           |


*(Feilkode-navn som starter med `n8n_` er historiske fra implementasjonen; det beskriver fortsatt den utgående integrasjonen.)*

### curl

Med API-nøkkel (anbefalt i produksjon når `TRIGGER_API_KEY` er satt):

```bash
curl -sS -X POST 'https://<base-url>/api/trigger' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: <din TRIGGER_API_KEY>' \
  -d '{"action":"cue_start","pressedAt":1713616496789}'
```

Uten nøkkel-krav på server (kun utvikling / eldre oppsett):

```bash
curl -sS -X POST 'https://<base-url>/api/trigger' \
  -H 'Content-Type: application/json' \
  -d '{"action":"cue_start","pressedAt":1713616496789}'
```

---

## Integrasjon for nye klienter


| Forutsetning    | Beskrivelse                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base-URL        | Deployet Speaker Cue Point-instans (f.eks. Scalingo).                                                                                                                                 |
| Transport       | HTTPS anbefales i produksjon.                                                                                                                                                         |
| Kontrakt        | JSON-body med `action` og `pressedAt` (se over).                                                                           |
| API-nøkkel      | Sett **`TRIGGER_API_KEY`** på server og **`VITE_TRIGGER_API_KEY`** (samme verdi) før web-build for nettleserklient. Header **`X-API-Key`** på alle `POST /api/trigger` når server krever det (`triggerAuthRequired` via `/api/health`). |
| Nye signaltyper | Krever endring av `ALLOWED_ACTIONS` i `server.js` (og vanligvis UI) – ikke bare konfigurasjon.                                                                                        |


---

## Felter klient vs. videreføring (kun for forståelse)


| Opprinnelse                            | Felt                  | Beskrivelse                                                                                   |
| -------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Klient sender                          | `action`, `pressedAt` | Obligatorisk; se valideringstabell over.                                                      |
| Backend utleder til intern integrasjon | `type`                | `start` ved `cue_start`, `stopp` ved `cue_stop`.                                              |
| Backend utleder                        | `epoch`               | Samme tidsøyeblikk som gyldig `pressedAt` (avrundet tall fra klient eller ms fra ISO-streng). |
| Backend utleder                        | `triggeredAt`         | `new Date(epoch).toISOString()` (UTC).                                                        |


Videreførings-body mot intern webhook inneholder alltid `action`, `type`, `triggeredAt`, `epoch` – slik kan nedstrøms (f.eks. automatisering) stole på konsistent `epoch`/`triggeredAt` ut fra klientens opprinnelige tidspunkt.

---

## Versjon og kilde

- Tillatte `action`-verdier, API-nøkkel og HTTP-håndtering: `server.js`.
- Tolking av `pressedAt`: `lib/parsePressedAt.js` (enhetstester i `test/parsePressedAt.test.js`, kjør `npm test`).
- Konstant-tids sammenligning av nøkkel: `lib/timingSafeEqual.js`.
- Klient som kaller backend: `src/lib/api.js` (sender `action`, `pressedAt`, og `X-API-Key` når `VITE_TRIGGER_API_KEY` er satt).

Ved avvik mellom dette dokumentet og koden gjelder **koden**.