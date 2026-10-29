import { isRouteErrorResponse, useRouteError } from 'react-router'

export const RouteError = () => {
  const error = useRouteError()
  const detail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : String(error)
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Da ist etwas schiefgelaufen</h1>
      <p className="mt-2 text-stone-600">Bitte laden Sie die Seite neu. Tritt der Fehler wieder auf, gehen Sie zur Startseite.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Neu laden
        </button>
        <a href="/" className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-stone-300 hover:bg-stone-50">
          Zur Startseite
        </a>
      </div>
      <p className="mt-8 font-mono text-xs break-all text-stone-400">{detail}</p>
    </main>
  )
}
