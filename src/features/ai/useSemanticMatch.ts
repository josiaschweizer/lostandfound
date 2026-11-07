import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { runSemanticMatch } from '@/services/ai'
import { useAiFeature } from './useAiStatus'

type Target = { token: string } | { lossId: string } | { itemId: string }

const alreadyRun = (key: string): boolean => {
  try {
    if (sessionStorage.getItem(key)) return true
    sessionStorage.setItem(key, '1')
  } catch {
    // ohne Speicher: einfach ausführen
  }
  return false
}

/**
 * Semantische Treffer (KONZEPT 7.4) unsichtbar im Hintergrund: läuft einmal pro Sitzung und Ziel,
 * sobald die Seite offen ist. Danach lädt `onDone` die Trefferliste neu. Ohne KI passiert nichts.
 */
export const useSemanticMatch = (target: Target | null, onDone: () => unknown) => {
  const enabled = useAiFeature('semantic_match')
  const key = target ? JSON.stringify(target) : null
  const { mutate, isPending, data } = useMutation({
    mutationFn: runSemanticMatch,
    onSuccess: async (stored) => {
      if (stored > 0) await onDone()
    },
  })
  useEffect(() => {
    if (!enabled || !key || alreadyRun(`lf-ai-match:${key}`)) return
    mutate(JSON.parse(key) as Target)
  }, [enabled, key, mutate])
  return { running: isPending, found: data ?? 0 }
}
