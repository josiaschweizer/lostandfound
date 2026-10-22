/** Übersetzt technische Fehler in verständliche Meldungen auf Deutsch. */

const KNOWN_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-Mail-Adresse oder Passwort ist falsch.'],
  [/user already registered/i, 'Für diese E-Mail-Adresse gibt es bereits ein Konto. Bitte anmelden.'],
  [/password should be at least/i, 'Das Passwort muss mindestens 6 Zeichen lang sein.'],
  [/email.*invalid|invalid.*email/i, 'Bitte eine gültige E-Mail-Adresse angeben.'],
  [/rate limit/i, 'Zu viele Versuche. Bitte einen Moment warten und erneut versuchen.'],
  [/invalid api key|no api key/i, 'Ungültiger Supabase-Key. Bitte VITE_SUPABASE_ANON_KEY in .env.local prüfen (siehe README).'],
  [/failed to fetch|network/i, 'Keine Verbindung zum Server. Bitte Internetverbindung und Konfiguration prüfen.'],
  [/row-level security|permission denied/i, 'Dafür fehlt die Berechtigung.'],
]

export class AppError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AppError'
  }
}

const rawMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return String(error)
}

export const toUserMessage = (error: unknown): string => {
  if (error instanceof AppError) return error.message
  const message = rawMessage(error)
  const known = KNOWN_MESSAGES.find(([pattern]) => pattern.test(message))
  if (known) return known[1]
  // Unsere Datenbankfunktionen liefern bereits deutsche Meldungen.
  if (/[äöü]|Bitte|nicht|Gegenstand|Anfrage|Organisation/.test(message)) return message
  return 'Es ist ein unerwarteter Fehler aufgetreten. Bitte erneut versuchen.'
}

type SupabaseResult = { data?: unknown; error: { message: string } | null }
type DataOf<R> = R extends { error: null; data: infer D } ? D : never

/** Wirft einen AppError, wenn ein Supabase-Ergebnis einen Fehler enthält, sonst die Daten. */
export const unwrap = <R extends SupabaseResult>(result: R): DataOf<R> => {
  ensureOk(result)
  return result.data as DataOf<R>
}

export const ensureOk = (result: { error: { message: string } | null }): void => {
  if (result.error) throw new AppError(toUserMessage(result.error), { cause: result.error })
}
