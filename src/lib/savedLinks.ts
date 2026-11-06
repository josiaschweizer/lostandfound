/**
 * Merkt sich im Browser die persönlichen Links («Meine Meldungen»). Zusatz zum Link in der E-Mail
 * (KONZEPT 5.8). Fehler beim Zugriff auf den Speicher werden ignoriert.
 */
export interface SavedLink {
  kind: 'loss' | 'claim'
  token: string
  title: string
  createdAt: string
}

const KEY = 'lostandfound:links'
export const SAVED_LINKS_EVENT = 'lostandfound:links-changed'

export const readSavedLinksRaw = (): string => {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export const parseSavedLinks = (raw: string): SavedLink[] => {
  try {
    const value: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? (value as SavedLink[]) : []
  } catch {
    return []
  }
}

const write = (links: SavedLink[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(links.slice(0, 20)))
  } catch {
    /* Speicher nicht verfügbar – der Link aus der E-Mail funktioniert trotzdem */
  }
  window.dispatchEvent(new Event(SAVED_LINKS_EVENT))
}

export const saveLink = (link: SavedLink) => write([link, ...parseSavedLinks(readSavedLinksRaw()).filter((l) => l.token !== link.token)])
export const removeLink = (token: string) => write(parseSavedLinks(readSavedLinksRaw()).filter((l) => l.token !== token))

export const linkPath = (link: Pick<SavedLink, 'kind' | 'token'>) => (link.kind === 'loss' ? `/verlust/${link.token}` : `/anfrage/${link.token}`)
