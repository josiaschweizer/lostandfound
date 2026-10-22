/** Wird angezeigt, wenn .env.local fehlt – statt kryptischer Netzwerkfehler. */
export const SetupNotice = () => (
  <main className="mx-auto max-w-2xl px-4 py-16">
    <h1 className="text-2xl font-semibold">Supabase ist noch nicht konfiguriert</h1>
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-stone-700">
      <li>
        <code>.env.example</code> nach <code>.env.local</code> kopieren.
      </li>
      <li>
        Im Supabase-Dashboard unter <em>Project Settings → API</em> den <strong>anon / publishable key</strong> eintragen.
      </li>
      <li>
        Dev-Server neu starten: <code>pnpm dev</code>
      </li>
    </ol>
    <p className="mt-4 text-sm text-stone-500">Details stehen im README.</p>
  </main>
)
