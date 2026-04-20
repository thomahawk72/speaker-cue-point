export default function CueButton({ label, onClick, loading, variant = 'primary' }) {
  const base =
    'w-full rounded-2xl px-6 py-5 text-lg font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950'

  const styles =
    variant === 'danger'
      ? 'bg-rose-500 hover:bg-rose-400 text-white focus:ring-rose-400/60'
      : 'bg-emerald-500 hover:bg-emerald-400 text-white focus:ring-emerald-400/60'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`${base} ${styles}`}
    >
      {loading ? 'Sender…' : label}
    </button>
  )
}
