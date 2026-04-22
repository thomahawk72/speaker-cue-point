import { useState } from 'react'
import CueButton from './CueButton.jsx'
import { triggerAction } from '../lib/api.js'

const BUTTONS = [
  { id: 'cue_start', label: 'Start', variant: 'primary' },
  { id: 'cue_stop', label: 'Stopp', variant: 'danger' },
]

const HISTORY_SIZE = 4

export default function QueSignal() {
  const [pending, setPending] = useState(null)
  const [history, setHistory] = useState([])

  function pushEntry(entry) {
    setHistory((prev) => [entry, ...prev].slice(0, HISTORY_SIZE))
  }

  async function handleClick(btn, { pressedAt }) {
    setPending(btn.id)
    try {
      await triggerAction(btn.id, pressedAt)
      pushEntry({
        kind: 'ok',
        text: `${btn.label} registrert · ${formatTime(new Date(pressedAt))}`,
      })
    } catch (err) {
      const msg = err?.data?.message || err?.message || 'Ukjent feil'
      pushEntry({
        kind: 'error',
        text: `${btn.label} feilet · ${msg}`,
      })
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 px-6 pt-10 pb-10 sm:pt-16">
      <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl">
        Que Signal
      </h1>

      <StatusLog history={history} />

      <div className="flex w-full max-w-sm flex-col gap-3">
        {BUTTONS.map((b) => (
          <CueButton
            key={b.id}
            label={b.label}
            variant={b.variant}
            loading={pending === b.id}
            onHoldComplete={(payload) => handleClick(b, payload)}
          />
        ))}
      </div>
    </div>
  )
}

function StatusLog({ history }) {
  const rows = Array.from({ length: HISTORY_SIZE }, (_, i) => history[i])

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-sm rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2"
    >
      <ul className="flex flex-col">
        {rows.map((entry, i) => (
          <li
            key={i}
            className="flex h-6 items-center gap-2 text-sm leading-6"
          >
            {entry ? (
              <>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    entry.kind === 'ok' ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <span
                  className={`truncate ${
                    entry.kind === 'ok' ? 'text-emerald-200' : 'text-rose-200'
                  }`}
                  title={entry.text}
                >
                  {entry.text}
                </span>
              </>
            ) : (
              <span aria-hidden="true" className="text-transparent select-none">
                &nbsp;
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatTime(date) {
  return date.toLocaleString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
