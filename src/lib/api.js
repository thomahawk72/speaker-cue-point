function messageFromTriggerError(data, httpStatus) {
  if (data?.message) return data.message
  if (data?.error === 'n8n_error') {
    const inner = data.data
    if (inner?.raw && typeof inner.raw === 'string') return inner.raw.trim()
    if (typeof inner?.message === 'string') return inner.message
    return `n8n svarte med HTTP ${data.status ?? httpStatus}`
  }
  if (data?.error === 'n8n_not_configured') {
    return data.message || 'N8N_WEBHOOK_URL er ikke satt på serveren.'
  }
  if (data?.error === 'n8n_timeout' || data?.error === 'n8n_unreachable') {
    return data.message || 'Kunne ikke fullføre kallet til n8n.'
  }
  if (data?.error === 'unknown_action') {
    return data.message || 'Ukjent aksjon.'
  }
  if (data?.error === 'invalid_pressed_at') {
    return data.message || 'Ugyldig tidspunkt (pressedAt).'
  }
  return `Feil (HTTP ${httpStatus})`
}

/** @param {number} pressedAt Millisekunder siden Unix epoch — tidspunkt da knappen ble trykket ned. */
export async function triggerAction(action, pressedAt) {
  const res = await fetch('/api/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, pressedAt }),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-json svar */
  }

  if (!res.ok) {
    const err = new Error(messageFromTriggerError(data, res.status))
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}
