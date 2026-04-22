# Speaker Cue Point – Backend API

Dette dokumentet beskriver det **offentlige HTTP-grensesnittet** til Speaker Cue Point.

## Oversikt

```
Klient ── HTTPS ──►  Speaker Cue Point API
```

- Klienten kaller `POST /api/trigger` med JSON-body som minst inneholder `action` (`cue_start` | `cue_stop`) og **`pressedAt`** – tidspunktet brukeren utløste handlingen (se under).


---

## Base-URL


| Produksjon              | URL                      |
| --------------------- | ------------------------ |
| Scalingo     | `https://que-signal.osc-fr1.scalingo.io/` |

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
| `triggerAuthRequired` | `false`: **`X-API-Key`** er ikke påkrevd for `POST /api/trigger`. `true`: du **må** sende header **`X-API-Key`** med den avtalte hemmeligheten; manglende/feil verdi gir **401**. |


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
| `X-API-Key`      | Påkrevd når **`triggerAuthRequired`** fra `GET /api/health` er `true` – bruk den oppgitte nøkkelen for denne instansen. |

### API-nøkkel (`X-API-Key`)

Når **`triggerAuthRequired`** er `true`, avvises `POST /api/trigger` uten gyldig **`X-API-Key`** med **401** (`error`: `unauthorized`).

Når **`triggerAuthRequired`** er `false`, trengs ikke **`X-API-Key`**.

Send **`X-API-Key`** i forespørselens header når health sier at autentisering er påkrevd (se curl under).

**Eksempel feilsvar 401**

```json
{
  "ok": false,
  "error": "unauthorized",
  "message": "Manglende eller ugyldig API-nøkkel. Send header X-API-Key med den hemmeligheten som er konfigurert for denne instansen."
}
```


**Body (JSON)**


| Felt        | Type                  | Påkrevd | Beskrivelse                                                                                                                                                                                                                                             |
| ----------- | --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action`    | string                | ja      | `cue_start`, `cue_stop`                                                                                                                                                                                                                                 |
| `pressedAt` | tall eller ISO-streng | ja      | Tidspunktet (nå!) som skal registreres. Tall = nøyaktig millisekunder siden Unix epoch (samme som JavaScript `Date.now()`). Alternativt ISO-8601-streng. |


```json
{ "action": "cue_start", "pressedAt": 1713616496789 }
```

```json
{ "action": "cue_stop", "pressedAt": "2026-04-20T12:34:56.789Z" }
```

- Ugyldig eller manglende `pressedAt` gir **400** (`invalid_pressed_at`).
- Ugyldig `action` gir **400** (`unknown_action`).

### Validering av `pressedAt`

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

Backend har mottatt forespørselen og har returnert OK.

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
| 401  | `unauthorized`       | Manglende eller feil `X-API-Key` når health krever autentisering (`triggerAuthRequired`) |
| 400  | `unknown_action`     | Ugyldig eller manglende `action`                                    |
| 400  | `invalid_pressed_at` | Manglende eller ugyldig `pressedAt`                                 |
| 502  | `n8n_error`          | Utgående integrasjon returnerte ikke suksess; se `status` og `data` |
| 503  | `n8n_not_configured` | Utgående webhook-URL er ikke satt på serveren                       |
| 504  | `n8n_timeout`        | Timeout mot utgående tjeneste (`N8N_TIMEOUT_MS`, standard 10 s)     |
| 502  | `n8n_unreachable`    | Nettverks-/DNS-feil mot utgående tjeneste                           |


*(Feilkode-navn som starter med `n8n_` er historiske fra implementasjonen; det beskriver fortsatt den utgående integrasjonen.)*

### curl

Med API-nøkkel (når `triggerAuthRequired` er `true`):

```bash
curl -sS -X POST 'https://<base-url>/api/trigger' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: <din hemmelige API-nøkkel>' \
  -d '{"action":"cue_start","pressedAt":1713616496789}'
```

---

## Integrasjon


| Forutsetning    | Beskrivelse                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base-URL        | URL-en der dette API-et er tilgjengelig.                                                                                                                                              |
| Transport       | HTTPS i produksjon.                                                                                                                                                         |
| Kontrakt        | JSON-body med `action` og `pressedAt` (se over).                                                                                                                                     |
| API-nøkkel      | Om instansen krever nøkkel, se **`triggerAuthRequired`** via `GET /api/health` og send **`X-API-Key`** etter avtale med drift.                                                              |


---

## Felter klient vs. videreføring (kun for forståelse)


| Opprinnelse                            | Felt                  | Beskrivelse                                                                                   |
| -------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Klient sender                          | `action`, `pressedAt` | Obligatorisk; se valideringstabell over.                                                      |
| Backend utleder til intern integrasjon | `type`                | `start` ved `cue_start`, `stopp` ved `cue_stop`.                                              |
| Backend utleder                        | `epoch`               | Samme tidsøyeblikk som gyldig `pressedAt` (avrundet tall fra klient eller ms fra ISO-streng). |
| Backend utleder                        | `triggeredAt`         | `new Date(epoch).toISOString()` (UTC).                                                        |


Videreførings-body mot intern webhook inneholder alltid `action`, `type`, `triggeredAt`, `epoch` – slik kan nedstrøms (f.eks. automatisering) stole på konsistent `epoch`/`triggeredAt` ut fra klientens opprinnelige tidspunkt.
