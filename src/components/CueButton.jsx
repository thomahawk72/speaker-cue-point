import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const HOLD_MS = 1000

export default function CueButton({ label, onHoldComplete, loading, variant = 'primary' }) {
  const [holdProgress, setHoldProgress] = useState(0)
  const rafRef = useRef(null)
  const holdStartRef = useRef(null)
  const firedRef = useRef(false)
  const buttonRef = useRef(null)
  const pointerCaptureIdRef = useRef(null)
  /** Wall-clock ms når bruker trykte (ikke når hold fullføres). */
  const pressedAtEpochMsRef = useRef(null)
  const onHoldCompleteRef = useRef(onHoldComplete)

  useEffect(() => {
    onHoldCompleteRef.current = onHoldComplete
  })

  const clearRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const releasePointerCaptureSafe = useCallback(() => {
    const btn = buttonRef.current
    const pid = pointerCaptureIdRef.current
    if (btn != null && pid != null) {
      try {
        if (btn.hasPointerCapture(pid)) btn.releasePointerCapture(pid)
      } catch {
        /* noop */
      }
    }
    pointerCaptureIdRef.current = null
  }, [])

  const resetHold = useCallback(() => {
    clearRaf()
    holdStartRef.current = null
    firedRef.current = false
    setHoldProgress(0)
    releasePointerCaptureSafe()
  }, [clearRaf, releasePointerCaptureSafe])

  const tickImplRef = useRef(() => {})

  useLayoutEffect(() => {
    tickImplRef.current = () => {
      if (holdStartRef.current == null) return
      const elapsed = performance.now() - holdStartRef.current
      const p = Math.min(1, elapsed / HOLD_MS)
      setHoldProgress(p)
      if (p >= 1) {
        if (!firedRef.current) {
          firedRef.current = true
          clearRaf()
          holdStartRef.current = null
          setHoldProgress(0)
          releasePointerCaptureSafe()
          const ts = pressedAtEpochMsRef.current
          if (typeof ts === 'number') {
            onHoldCompleteRef.current({ pressedAt: ts })
          } else {
            onHoldCompleteRef.current({ pressedAt: Date.now() })
          }
        }
        return
      }
      rafRef.current = requestAnimationFrame(() => tickImplRef.current())
    }
  }, [clearRaf, releasePointerCaptureSafe])

  const startHold = useCallback(() => {
    if (loading) return
    pressedAtEpochMsRef.current = Date.now()
    firedRef.current = false
    holdStartRef.current = performance.now()
    setHoldProgress(0)
    rafRef.current = requestAnimationFrame(() => tickImplRef.current())
  }, [loading])

  const endHoldEarly = useCallback(() => {
    if (firedRef.current) {
      firedRef.current = false
      return
    }
    resetHold()
  }, [resetHold])

  useEffect(() => () => clearRaf(), [clearRaf])

  useEffect(() => {
    if (!loading) return
    const id = requestAnimationFrame(() => {
      resetHold()
    })
    return () => cancelAnimationFrame(id)
  }, [loading, resetHold])

  function onPointerDown(e) {
    if (loading) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    pointerCaptureIdRef.current = e.pointerId
    startHold()
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerUp(e) {
    endHoldEarly()
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      /* allerede sluppet */
    }
  }

  function onPointerCancel() {
    endHoldEarly()
  }

  function onKeyDown(e) {
    if (loading) return
    if (e.key !== ' ' && e.key !== 'Enter') return
    if (e.repeat) return
    e.preventDefault()
    startHold()
  }

  function onKeyUp(e) {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    endHoldEarly()
  }

  const base =
    'relative w-full overflow-hidden rounded-2xl px-6 py-5 text-lg font-semibold select-none touch-manipulation transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950'

  const styles =
    variant === 'danger'
      ? 'bg-rose-500 hover:bg-rose-400 text-white focus:ring-rose-400/60'
      : 'bg-emerald-500 hover:bg-emerald-400 text-white focus:ring-emerald-400/60'

  const fillTint = variant === 'danger' ? 'bg-rose-200/35' : 'bg-emerald-200/35'

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${base} ${styles}`}
      disabled={loading}
      aria-label={`${label}. Hold inne i ett sekund for å sende.`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      <span
        className={`pointer-events-none absolute inset-0 origin-left ${fillTint}`}
        style={{ transform: `scaleX(${holdProgress})` }}
        aria-hidden
      />
      <span className="relative z-10">{loading ? 'Sender…' : label}</span>
    </button>
  )
}
