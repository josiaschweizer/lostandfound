import type { ItemStatus, RequestStatus, ReturnRequest } from './types'

/**
 * Regeln für Status und Anfragen. Die Datenbank (RPC-Funktionen) erzwingt
 * dieselben Regeln; hier dienen sie dazu, nur gültige Aktionen anzuzeigen.
 */

export const canConfirmRequest = (
  request: Pick<ReturnRequest, 'status'>,
  itemStatus: ItemStatus,
  otherRequests: readonly Pick<ReturnRequest, 'status'>[],
): boolean =>
  request.status === 'open' && itemStatus !== 'returned' && !otherRequests.some((r) => r.status === 'confirmed')

export const canRejectRequest = (request: Pick<ReturnRequest, 'status'>): boolean =>
  request.status === 'open' || request.status === 'confirmed'

export const isRequestClosed = (status: RequestStatus): boolean => status === 'rejected' || status === 'completed'

/** Welche Status sind für einen Gegenstand von hier aus wählbar? */
export const allowedItemStatuses = (
  current: ItemStatus,
  requests: readonly Pick<ReturnRequest, 'status'>[],
): ItemStatus[] => {
  const hasConfirmed = requests.some((r) => r.status === 'confirmed')
  const all: ItemStatus[] = ['available', 'reserved', 'returned']
  return all.filter((status) => status !== current && !(status === 'available' && hasConfirmed))
}

/** Offene Anfragen, die nach einer Rückgabe noch bewusst abgelehnt werden müssen. */
export const pendingAfterReturn = <T extends Pick<ReturnRequest, 'status'>>(
  itemStatus: ItemStatus,
  requests: readonly T[],
): T[] => (itemStatus === 'returned' ? requests.filter((r) => r.status === 'open') : [])
