import dotenv from 'dotenv'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parsePressedAtMs } from './lib/parsePressedAt.js'
import { timingSafeEqualString } from './lib/timingSafeEqual.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Lokalt: les .env fra prosjektmappa. På Scalingo settes variabler i process.env av plattformen
// — ikke les .env fra disk (unngår at tom/feil fil overskygger eller forvirrer).
const onScalingo = Boolean(process.env.SCALINGO_APPLICATION_ID)
if (!onScalingo) {
  dotenv.config({
    path: path.join(__dirname, '.env'),
    override: false,
  })
}

const PORT = process.env.PORT || 3001
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL
const N8N_AUTH_HEADER = process.env.N8N_AUTH_HEADER
// Må matche n8n «Header Auth»-navn (f.eks. N8N_AUTH_HEADER). Default: Authorization.
const N8N_WEBHOOK_AUTH_HEADER_NAME =
  process.env.N8N_WEBHOOK_AUTH_HEADER_NAME || 'Authorization'
const N8N_TIMEOUT_MS = Number(process.env.N8N_TIMEOUT_MS || 10000)
/** Når satt, kreves header `X-API-Key` med samme verdi på `POST /api/trigger`. */
const TRIGGER_API_KEY = process.env.TRIGGER_API_KEY

// Hvilke knapp-id-er vi tillater \u00e5 proxy til n8n. Holdes bevisst
// liten og eksplisitt for \u00e5 unngre at klienten kan sende vilk\u00e5rlige payloads.
const ALLOWED_ACTIONS = new Set(['cue_start', 'cue_stop'])

const app = express()
app.use(express.json({ limit: '16kb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    n8nConfigured: Boolean(N8N_WEBHOOK_URL),
    triggerAuthRequired: Boolean(TRIGGER_API_KEY),
  })
})

app.post('/api/trigger', async (req, res) => {
  if (TRIGGER_API_KEY) {
    const sent = req.get('x-api-key')
    if (!timingSafeEqualString(sent ?? '', TRIGGER_API_KEY)) {
      return res.status(401).json({
        ok: false,
        error: 'unauthorized',
        message:
          'Manglende eller ugyldig API-nøkkel. Send header X-API-Key med den hemmeligheten som er konfigurert for denne instansen.',
      })
    }
  }

  const { action, pressedAt } = req.body || {}

  if (!action || typeof action !== 'string' || !ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({
      ok: false,
      error: 'unknown_action',
      message: `Ukjent action. Tillatt: ${[...ALLOWED_ACTIONS].join(', ')}`,
    })
  }

  const epoch = parsePressedAtMs(pressedAt)
  if (epoch === null) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_pressed_at',
      message:
        'pressedAt mangler eller er ugyldig. Send millisekunder siden Unix epoch (tall) eller ISO-8601-streng.',
    })
  }

  if (!N8N_WEBHOOK_URL) {
    return res.status(503).json({
      ok: false,
      error: 'n8n_not_configured',
      message: 'N8N_WEBHOOK_URL er ikke satt p\u00e5 serveren.',
    })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS)

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (N8N_AUTH_HEADER) headers[N8N_WEBHOOK_AUTH_HEADER_NAME] = N8N_AUTH_HEADER

    const type = action === 'cue_start' ? 'start' : 'stopp'
    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action,
        type,
        triggeredAt: new Date(epoch).toISOString(),
        epoch,
      }),
      signal: controller.signal,
    })

    const text = await n8nRes.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text }
    }

    if (!n8nRes.ok) {
      return res.status(502).json({
        ok: false,
        error: 'n8n_error',
        status: n8nRes.status,
        data,
      })
    }

    return res.json({ ok: true, action, status: n8nRes.status, data })
  } catch (err) {
    const isTimeout = err?.name === 'AbortError'
    return res.status(isTimeout ? 504 : 502).json({
      ok: false,
      error: isTimeout ? 'n8n_timeout' : 'n8n_unreachable',
      message: err?.message || String(err),
    })
  } finally {
    clearTimeout(timeout)
  }
})

// I produksjon serverer vi den byggede klient-bundelen fra dist/.
// I utvikling kj\u00f8rer Vite sin egen dev-server p\u00e5 5173 og proxier /api hit.
if (process.env.NODE_ENV !== 'development') {
  const distDir = path.join(__dirname, 'dist')
  app.use(express.static(distDir))
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`[server] lytter p\u00e5 http://localhost:${PORT}`)
  if (onScalingo) {
    console.log('[server] Scalingo: milj\u00f8variabler fra plattform (ingen .env-fil).')
  }
  if (!N8N_WEBHOOK_URL) {
    console.warn('[server] ADVARSEL: N8N_WEBHOOK_URL er ikke satt \u2013 /api/trigger vil feile.')
  }
  if (!TRIGGER_API_KEY) {
    console.warn(
      '[server] ADVARSEL: TRIGGER_API_KEY er ikke satt \u2013 POST /api/trigger er \u00e5pen uten API-n\u00f8kkel.',
    )
  }
})
