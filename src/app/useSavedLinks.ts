import { useMemo, useSyncExternalStore } from 'react'
import { parseSavedLinks, readSavedLinksRaw, SAVED_LINKS_EVENT, type SavedLink } from '@/lib/localTokens'

const subscribe = (onChange: () => void) => {
  window.addEventListener(SAVED_LINKS_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(SAVED_LINKS_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export const useSavedLinks = (): SavedLink[] => {
  const raw = useSyncExternalStore(subscribe, readSavedLinksRaw, () => '')
  return useMemo(() => parseSavedLinks(raw), [raw])
}
