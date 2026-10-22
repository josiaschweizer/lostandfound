import { supabase } from '@/lib/supabase'
import type { ItemCategory, ItemColor, LossReport, LossReportStatus, SimulatedEmail } from '@/domain/types'
import { unwrap } from './errors'
import { toLossReport } from './mappers'

export interface LossReportInput {
  organisationId: string | null
  name: string
  contact: string
  title: string
  category: ItemCategory
  color: ItemColor
  brand: string
  lostOn: string
  lostLocation: string
  description: string
}

export const submitLossReport = async (input: LossReportInput): Promise<string> =>
  unwrap(
    await supabase.rpc('submit_loss_report', {
      p_organisation_id: input.organisationId,
      p_name: input.name,
      p_contact: input.contact,
      p_title: input.title,
      p_category: input.category,
      p_color: input.color,
      p_brand: input.brand,
      p_lost_on: input.lostOn,
      p_lost_location: input.lostLocation,
      p_description: input.description,
    }),
  )

export interface LossReportView {
  id: string
  organisationId: string | null
  reporterName: string
  title: string
  category: ItemCategory
  color: ItemColor
  brand: string | null
  lostOn: string
  lostLocation: string
  description: string
  status: LossReportStatus
  createdAt: string
  emails: SimulatedEmail[]
}

export const getLossReportByToken = async (token: string): Promise<LossReportView | null> =>
  unwrap(await supabase.rpc('get_loss_report', { p_token: token })) as LossReportView | null

// --- Mitarbeitende -----------------------------------------------------------

/** RLS liefert Meldungen an die eigene Organisation und alle «weiss nicht»-Meldungen. */
export const listLossReports = async (): Promise<LossReport[]> => {
  const rows = unwrap(await supabase.from('loss_reports').select('*').order('created_at', { ascending: false }))
  return rows.map(toLossReport)
}

/** Simuliert eine E-Mail an die meldende Person. Liefert false, wenn bereits benachrichtigt. */
export const notifyMatch = async (reportId: string, itemId: string): Promise<boolean> =>
  unwrap(await supabase.rpc('notify_loss_report_match', { p_report_id: reportId, p_item_id: itemId }))

export const closeLossReport = async (reportId: string): Promise<void> => {
  unwrap(await supabase.rpc('close_loss_report', { p_report_id: reportId }))
}
