import { useState } from 'react'

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const expected = import.meta.env.VITE_APP_PASSWORD

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!expected) {
      setError(
        'Passord er ikke konfigurert. Sett VITE_APP_PASSWORD i .env-filen.'
      )
      return
    }

    setLoading(true)
    // Liten kunstig delay for å unngå "brute force"-følelse i UI.
    setTimeout(() => {
      if (password === expected) {
        onSuccess()
      } else {
        setError('Feil passord')
        setPassword('')
      }
      setLoading(false)
    }, 200)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-slate-900/70 p-6 shadow-xl ring-1 ring-white/10 backdrop-blur"
      >
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">
          Que Signal
        </h1>
        <p className="mb-6 text-center text-sm text-slate-400">
          Skriv inn passord for å fortsette
        </p>

        <label htmlFor="password" className="mb-2 block text-sm text-slate-300">
          Passord
        </label>
        <input
          id="password"
          type="password"
          inputMode="text"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
          placeholder="••••••••"
        />

        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-5 w-full rounded-xl bg-indigo-500 px-4 py-3 text-base font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Sjekker…' : 'Logg inn'}
        </button>
      </form>
    </div>
  )
}
