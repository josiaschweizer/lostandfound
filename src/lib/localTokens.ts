/**
 * Merkt sich im Browser die Links zu eigenen Anfragen/Meldungen (nur Komfort für die Demo).
 * Fehler beim Zugriff auf localStorage werden ignoriert.
 */
export interface SavedLink {
  kind: 'request' | 'report'
  token: string
  title: string
  createdAt: string
}

const KEY = 'lostandfound:my-links'

export const loadSavedLinks = (): SavedLink[] => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedLink[]) : []
  } catch {
    return []
  }
}

export const saveLink = (link: SavedLink): void => {
  try {
    const links = [link, ...loadSavedLinks().filter((l) => l.token !== link.token)].slice(0, 20)
    localStorage.setItem(KEY, JSON.stringify(links))
  } catch {
    /* Speicher nicht verfügbar – ohne Komfortfunktion weiterarbeiten */
  }
}

export const clearSavedLinks = (): void => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignorieren */
  }
}

export const linkPath = (link: Pick<SavedLink, 'kind' | 'token'>): string =>
  link.kind === 'request' ? `/status/anfrage/${link.token}` : `/status/meldung/${link.token}`
