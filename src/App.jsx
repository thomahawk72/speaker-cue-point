import { useEffect, useState } from 'react'
import Login from './components/Login.jsx'
import AppShell from './components/AppShell.jsx'
import QueSignal from './components/QueSignal.jsx'
import About from './components/About.jsx'

const AUTH_KEY = 'speaker-cue-point.authed'

export default function App() {
  const [authed, setAuthed] = useState(() => {
    try {
      return sessionStorage.getItem(AUTH_KEY) === '1'
    } catch {
      return false
    }
  })
  const [view, setView] = useState('que')

  useEffect(() => {
    try {
      if (authed) sessionStorage.setItem(AUTH_KEY, '1')
      else sessionStorage.removeItem(AUTH_KEY)
    } catch {
      /* noop */
    }
  }, [authed])

  function handleLogout() {
    setAuthed(false)
    setView('que')
  }

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />
  }

  return (
    <AppShell view={view} onNavigate={setView} onLogout={handleLogout}>
      {view === 'about' ? (
        <About onClose={() => setView('que')} />
      ) : (
        <QueSignal />
      )}
    </AppShell>
  )
}
