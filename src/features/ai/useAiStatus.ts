import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { getAiStatus } from '@/services/ai'

/** Ist die KI eingeschaltet (AI_ENABLED) und die Aktion freigegeben? Ohne Antwort: aus. */
export const useAiFeature = (feature: string): boolean => {
  const { data } = useQuery({ queryKey: queryKeys.aiStatus, queryFn: getAiStatus, staleTime: 10 * 60_000, retry: false })
  return Boolean(data?.enabled && data.features.includes(feature))
}
