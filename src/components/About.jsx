const panels = [
  {
    title: 'Que Signal',
    bullets: [
      'Hovedsiden med knappene Start og Stopp.',
      'Trykk på en knapp for å sende et signal til n8n-arbeidsflyten.',
      'Statusvinduet viser de fire siste registrerte trykkene med dato og tid.',
    ],
  },
  {
    title: 'Innlogging',
    bullets: [
      'Appen er beskyttet med et enkelt passord som settes på serveren.',
      'Passordet sjekkes på klient-siden og holder økten levende i samme nettleserfane.',
      'Trykk på «Logg ut» i menyen for å avslutte økten.',
    ],
  },
  {
    title: 'Integrasjon med n8n',
    bullets: [
      'Knapper kaller en intern backend som videresender til n8n via en skjult webhook.',
      'Webhook-URL og eventuell autentisering holdes på serveren, ikke i nettleseren.',
      'Svar fra n8n vises som kvittering i statusvinduet; feil vises i rødt.',
    ],
  },
]

export default function About({ onClose }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Om Speaker Cue Point</h1>
        <p className="text-sm text-slate-400">
          Enkel mobilvennlig webapp for å utløse cue-signaler mot en n8n-arbeidsflyt.
        </p>
      </div>

      {panels.map((panel) => (
        <section
          key={panel.title}
          className="rounded-xl border border-white/10 bg-slate-900/60 p-5"
        >
          <h2 className="mb-3 text-base font-semibold tracking-tight text-slate-100">
            {panel.title}
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-300">
            {panel.bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          Lukk
        </button>
      </div>
    </div>
  )
}
