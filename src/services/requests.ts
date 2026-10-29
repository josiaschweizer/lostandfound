import { supabase } from '@/lib/supabase'
import type { ItemCategory, RequestStatus, ReturnRequest, SimulatedEmail } from '@/domain/types'
import { unwrap } from './errors'
import { toReturnRequest } from './mappers'

interface ReturnRequestInput {
  name: string
  contact: string
  message: string
  proof: string
}

/** Suchende stellen eine Anfrage ohne Konto. Liefert das geheime Token für die Statusseite. */
export const submitReturnRequest = async (itemId: string, input: ReturnRequestInput): Promise<string> =>
  unwrap(
    await supabase.rpc('submit_return_request', {
      p_item_id: itemId,
      p_name: input.name,
      p_contact: input.contact,
      p_message: input.message,
      p_proof: input.proof,
    }),
  )

interface RequestStatusView {
  status: RequestStatus
  claimantName: string
  pickupInstructions: string | null
  decisionNote: string | null
  createdAt: string
  decidedAt: string | null
  item: { id: string; title: string; itemNumber: string; category: ItemCategory; photoPath: string | null }
  organisation: { name: string; slug: string }
  office: { name: string; location: string; openingHours: string; contactEmail: string }
  emails: SimulatedEmail[]
}

export const getRequestStatus = async (token: string): Promise<RequestStatusView | null> =>
  unwrap(await supabase.rpc('get_return_request_status', { p_token: token })) as RequestStatusView | null

export const listRequests = async (organisationId: string): Promise<ReturnRequest[]> => {
  const rows = unwrap(
    await supabase
      .from('return_requests')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false }),
  )
  return rows.map(toReturnRequest)
}

export interface Decision {
  confirm: boolean
  pickupInstructions?: string
  note?: string
}

export const decideRequest = async (id: string, decision: Decision): Promise<void> => {
  unwrap(
    await supabase.rpc('decide_return_request', {
      p_request_id: id,
      p_confirm: decision.confirm,
      p_pickup_instructions: decision.pickupInstructions ?? '',
      p_note: decision.note ?? '',
    }),
  )
}
