import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { getPublicItemByNumber, listOffices, listPublicItems, listSynonyms } from '@/services/catalog'
import { getMyClaim, getMyLoss } from '@/services/public'

export const useOffices = () => useQuery({ queryKey: queryKeys.offices, queryFn: listOffices, staleTime: 5 * 60_000 })

export const useOfficeMap = () => {
  const { data } = useOffices()
  return useMemo(() => new Map((data ?? []).map((office) => [office.id, office])), [data])
}

export const useCatalog = () => useQuery({ queryKey: queryKeys.catalog, queryFn: listPublicItems })

export const useSynonyms = () => useQuery({ queryKey: queryKeys.synonyms, queryFn: listSynonyms, staleTime: Infinity })

export const usePublicItem = (itemNumber: string) =>
  useQuery({ queryKey: queryKeys.item(itemNumber), queryFn: () => getPublicItemByNumber(itemNumber) })

export const useMyLoss = (token: string) => useQuery({ queryKey: queryKeys.myLoss(token), queryFn: () => getMyLoss(token) })

export const useMyClaim = (token: string) => useQuery({ queryKey: queryKeys.myClaim(token), queryFn: () => getMyClaim(token) })
