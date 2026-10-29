import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { getPublicItem, listPublicItems } from '@/services/catalog'
import { getLossReportByToken } from '@/services/lossReports'
import { getOrganisationBySlug, listOrganisations } from '@/services/organisations'
import { getRequestStatus } from '@/services/requests'

export const useOrganisations = () => useQuery({ queryKey: queryKeys.organisations, queryFn: listOrganisations })

export const useOrganisationLookup = () => {
  const { data } = useOrganisations()
  return useMemo(() => new Map((data ?? []).map((o) => [o.id, o])), [data])
}

export const useOrganisation = (slug: string) =>
  useQuery({ queryKey: queryKeys.organisation(slug), queryFn: () => getOrganisationBySlug(slug) })

export const useCatalog = () => useQuery({ queryKey: queryKeys.catalog, queryFn: listPublicItems })

export const usePublicItem = (id: string) => useQuery({ queryKey: queryKeys.publicItem(id), queryFn: () => getPublicItem(id) })

export const useRequestStatus = (token: string) =>
  useQuery({ queryKey: queryKeys.requestStatus(token), queryFn: () => getRequestStatus(token) })

export const useLossReport = (token: string) =>
  useQuery({ queryKey: queryKeys.lossReport(token), queryFn: () => getLossReportByToken(token) })
