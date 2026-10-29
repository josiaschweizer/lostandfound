import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStaffContext } from '@/app/useAuth'
import { queryKeys } from '@/lib/queryKeys'
import { findMatches } from '@/domain/matching'
import type { ItemStatus } from '@/domain/types'
import { listOutbox } from '@/services/emails'
import { closeLossReport, listLossReports, notifyMatch } from '@/services/lossReports'
import { updateOffice, type OfficeUpdate } from '@/services/organisations'
import { decideRequest, listRequests, type Decision } from '@/services/requests'
import { changeItemStatus, createItem, getStaffItem, listStaffItems, updateItem, type ItemInput } from '@/services/staffItems'

/** Alle Abfragen sind an die Organisation des angemeldeten Kontos gebunden. */
const useOrgId = () => useStaffContext().organisation.id

export const useStaffItems = () => {
  const orgId = useOrgId()
  return useQuery({ queryKey: queryKeys.staffItems(orgId), queryFn: () => listStaffItems(orgId) })
}

export const useStaffItem = (id: string) => {
  const orgId = useOrgId()
  return useQuery({ queryKey: queryKeys.staffItem(orgId, id), queryFn: () => getStaffItem(orgId, id), enabled: id !== '' })
}

export const useRequests = () => {
  const orgId = useOrgId()
  return useQuery({ queryKey: queryKeys.staffRequests(orgId), queryFn: () => listRequests(orgId) })
}

export const useLossReports = () => {
  const orgId = useOrgId()
  return useQuery({ queryKey: queryKeys.staffLossReports(orgId), queryFn: listLossReports })
}

export const useOutbox = () => {
  const orgId = useOrgId()
  return useQuery({ queryKey: queryKeys.outbox(orgId), queryFn: () => listOutbox(orgId) })
}

const useInvalidateAll = () => {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(orgId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.catalog }),
    ])
}

export const useSaveItem = () => {
  const orgId = useOrgId()
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ItemInput }) =>
      id ? updateItem(orgId, id, input).then(() => id) : createItem(orgId, input),
    onSuccess: invalidate,
  })
}

export const useChangeItemStatus = () => {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ItemStatus }) => changeItemStatus(id, status),
    onSuccess: invalidate,
  })
}

export const useDecideRequest = () => {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: Decision }) => decideRequest(id, decision),
    onSuccess: invalidate,
  })
}

export const useNotifyMatch = () => {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ reportId, itemId }: { reportId: string; itemId: string }) => notifyMatch(reportId, itemId),
    onSuccess: invalidate,
  })
}

export const useCloseLossReport = () => {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: closeLossReport, onSuccess: invalidate })
}

export const useUpdateOffice = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ officeId, input }: { officeId: string; input: OfficeUpdate }) => updateOffice(officeId, input),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export const ALREADY_RETURNED_NOTE =
  'Der Gegenstand wurde inzwischen nach Prüfung der Eigentumsnachweise einer anderen Person übergeben. Falls Sie etwas anderes verloren haben, melden Sie den Verlust gerne auf der Plattform.'

export const useRejectRequests = () => {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: async ({ ids, note }: { ids: string[]; note: string }) => {
      for (const id of ids) await decideRequest(id, { confirm: false, note })
      return ids.length
    },
    onSettled: invalidate,
  })
}

/** Treffer nach fester Regel und nur mit öffentlichen Gegenständen – wie in der Liste der Verlustmeldungen. */
export const useStaffTodo = () => {
  const requests = useRequests()
  const items = useStaffItems()
  const reports = useLossReports()
  return useMemo(() => {
    const publicItems = (items.data ?? []).filter((i) => i.isPublic)
    const openReports = (reports.data ?? []).filter((r) => r.status === 'open')
    return {
      isLoading: requests.isPending || items.isPending || reports.isPending,
      openRequests: (requests.data ?? []).filter((r) => r.status === 'open').length,
      awaitingPickup: (requests.data ?? []).filter((r) => r.status === 'confirmed').length,
      reportsWithMatches: openReports.filter((r) => findMatches(r, publicItems).length > 0).length,
    }
  }, [requests.data, requests.isPending, items.data, items.isPending, reports.data, reports.isPending])
}
