import { useState } from 'react'
import Drawer from './Drawer.jsx'

export default function AppShell({ view, onNavigate, onLogout, children }) {
  const [open, setOpen] = useState(false)

  function handleNav(next) {
    setOpen(false)
    if (next !== view) onNavigate(next)
  }

  function handleLogout() {
    setOpen(false)
    onLogout()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="flex h-14 items-center px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Åpne meny"
            className="-ml-1 rounded-md p-2 text-slate-300 hover:bg-white/5 sm:hidden"
          >
            <MenuIcon />
          </button>

          <span className="px-2 text-sm font-semibold tracking-tight text-slate-100">
            Speaker Cue Point
          </span>

          <nav className="ml-auto hidden sm:flex sm:items-center sm:gap-1">
            <DesktopLink
              active={view === 'que'}
              onClick={() => handleNav('que')}
            >
              Que Signal
            </DesktopLink>
            <DesktopLink
              active={view === 'about'}
              onClick={() => handleNav('about')}
            >
              Om
            </DesktopLink>
            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
            >
              Logg ut
            </button>
          </nav>
        </div>
      </header>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Meny"
      >
        <nav className="flex flex-col gap-1">
          <DrawerItem
            active={view === 'que'}
            onClick={() => handleNav('que')}
          >
            Que Signal
          </DrawerItem>
          <DrawerItem
            active={view === 'about'}
            onClick={() => handleNav('about')}
          >
            Om
          </DrawerItem>
          <div className="mt-2 border-t border-white/10 pt-2">
            <DrawerItem onClick={handleLogout}>Logg ut</DrawerItem>
          </div>
        </nav>
      </Drawer>

      <main className="flex-1">{children}</main>
    </div>
  )
}

function DesktopLink({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-white/10 text-white'
          : 'text-slate-300 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  )
}

function DrawerItem({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
        active
          ? 'bg-white/10 text-white'
          : 'text-slate-300 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  )
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  )
}
