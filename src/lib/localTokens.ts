/**
 * Merkt sich im Browser die Links zu eigenen Anfragen/Meldungen («Meine Anfragen»).
 * Fehler beim Zugriff auf localStorage werden ignoriert.
 */
export interface SavedLink {
  kind: 'request' | 'report'
  token: string
  title: string
  createdAt: string
}

const KEY = 'lostandfound:my-links'
/** Wird nach jeder Änderung ausgelöst, damit die Oberfläche (useSavedLinks) aktualisiert. */
export const SAVED_LINKS_EVENT = 'lostandfound:links-changed'

const notify = () => {
  try {
    window.dispatchEvent(new Event(SAVED_LINKS_EVENT))
  } catch {
    /* ignorieren */
  }
}

/** Roher Speicherinhalt – stabiler Wert für useSyncExternalStore. */
export const readSavedLinksRaw = (): string => {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export const parseSavedLinks = (raw: string): SavedLink[] => {
  try {
    return raw ? (JSON.parse(raw) as SavedLink[]) : []
  } catch {
    return []
  }
}

export const loadSavedLinks = (): SavedLink[] => parseSavedLinks(readSavedLinksRaw())

export const saveLink = (link: SavedLink): void => {
  try {
    const links = [link, ...loadSavedLinks().filter((l) => l.token !== link.token)].slice(0, 20)
    localStorage.setItem(KEY, JSON.stringify(links))
  } catch {
    /* Speicher nicht verfügbar – ohne Komfortfunktion weiterarbeiten */
  }
  notify()
}

export const removeLink = (token: string): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadSavedLinks().filter((l) => l.token !== token)))
  } catch {
    /* ignorieren */
  }
  notify()
}

export const clearSavedLinks = (): void => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignorieren */
  }
  notify()
}

export const linkPath = (link: Pick<SavedLink, 'kind' | 'token'>): string =>
  link.kind === 'request' ? `/status/anfrage/${link.token}` : `/status/meldung/${link.token}`
