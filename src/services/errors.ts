import { t } from '@/i18n/de-CH'

/** Fehler mit einer Meldung, die direkt angezeigt werden kann. */
export class AppError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AppError'
  }
}

const KNOWN: [RegExp, string][] = [
  [/invalid login credentials/i, t.admin.login.wrong],
  [/failed to fetch|network|load failed/i, t.common.network],
  [/permission denied|row-level security|jwt/i, t.common.noPermission],
]

const rawMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return String(error)
}

/** Unsere Datenbankfunktionen liefern deutsche Meldungen – diese werden unverändert angezeigt. */
const looksGerman = (message: string) => /[äöüÄÖÜ«»]|Bitte |nicht |Anfrage|Fund|Meldung|Zu viele/.test(message)

export const toUserMessage = (error: unknown): string => {
  if (error instanceof AppError) return error.message
  const message = rawMessage(error)
  const known = KNOWN.find(([pattern]) => pattern.test(message))
  if (known) return known[1]
  if (looksGerman(message)) return message
  return t.common.unexpected
}

type Result<T> = { data: T; error: null } | { data: unknown; error: { message: string } }

/** Wirft bei einem Supabase-Fehler eine AppError mit verständlicher Meldung. */
export const unwrap = <T>(result: Result<T> | { data: T | null; error: { message: string } | null }): T => {
  if (result.error) throw new AppError(toUserMessage(result.error), { cause: result.error })
  return result.data as T
}
