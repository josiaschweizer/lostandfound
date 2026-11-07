import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
  getAiStats, getItemHistory, getLossReport, getMatchCounts, getStaffItem, listClaims, listLossReports, listOutbox, listStaffItems,
  listStaffMembers, matchForItem, matchForLoss,
} from '@/services/staff'

export const useStaffItems = () => useQuery({ queryKey: queryKeys.staffItems, queryFn: listStaffItems })
export const useStaffItem = (id: string) => useQuery({ queryKey: queryKeys.staffItem(id), queryFn: () => getStaffItem(id), enabled: Boolean(id) })
export const useItemHistory = (id: string) => useQuery({ queryKey: queryKeys.itemHistory(id), queryFn: () => getItemHistory(id), enabled: Boolean(id) })
export const useItemMatches = (id: string) => useQuery({ queryKey: queryKeys.itemMatches(id), queryFn: () => matchForItem(id), enabled: Boolean(id) })
export const useMatchCounts = () => useQuery({ queryKey: queryKeys.matchCounts, queryFn: getMatchCounts })
export const useLossReports = () => useQuery({ queryKey: queryKeys.lossReports, queryFn: listLossReports })
export const useLossReport = (id: string) => useQuery({ queryKey: queryKeys.lossReport(id), queryFn: () => getLossReport(id) })
export const useLossMatches = (id: string) => useQuery({ queryKey: queryKeys.lossMatches(id), queryFn: () => matchForLoss(id) })
export const useClaims = () => useQuery({ queryKey: queryKeys.claims, queryFn: listClaims })
export const useOutbox = () => useQuery({ queryKey: queryKeys.outbox, queryFn: listOutbox })
export const useMembers = () => useQuery({ queryKey: queryKeys.members, queryFn: listStaffMembers, staleTime: 5 * 60_000 })
export const useAiStats = () => useQuery({ queryKey: queryKeys.aiStats, queryFn: getAiStats })
