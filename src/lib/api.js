export async function triggerAction(action) {
  const res = await fetch('/api/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-json svar */
  }

  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}
