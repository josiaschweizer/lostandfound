import { supabase } from '@/lib/supabase'
import type {
  Claim, Email, ItemCategory, ItemColor, ItemHistoryEntry, ItemStatus, LossReport, MatchItem, StaffItem,
} from '@/domain/types'
import { unwrap } from './errors'
import { toClaim, toEmail, toHistory, toLossReport, toMatchItem, toStaffItem } from './mappers'

/** Verwaltung. RLS beschränkt alle Abfragen auf die eigene Fundstelle; Änderungen laufen über RPCs. */

type Rows = Record<string, unknown>[]
const STAFF_ITEM_SELECT = '*, found_item_internal(*)'

export const listStaffItems = async (): Promise<StaffItem[]> => {
  const rows = unwrap(await supabase.from('found_items').select(STAFF_ITEM_SELECT).order('created_at', { ascending: false })) as Rows
  return rows.map(toStaffItem)
}

export const getStaffItem = async (id: string): Promise<StaffItem | null> => {
  const row = unwrap(await supabase.from('found_items').select(STAFF_ITEM_SELECT).eq('id', id).maybeSingle()) as Rows[number] | null
  return row ? toStaffItem(row) : null
}

export const getItemHistory = async (id: string): Promise<ItemHistoryEntry[]> => {
  const rows = unwrap(await supabase.from('item_history').select('*').eq('item_id', id).order('changed_at', { ascending: false }).order('id', { ascending: false })) as Rows
  return rows.map(toHistory)
}

export interface StaffMember {
  userId: string
  fullName: string
}

export const listStaffMembers = async (): Promise<StaffMember[]> => {
  const rows = unwrap(await supabase.from('memberships').select('user_id, full_name')) as Rows
  return rows.map((row) => ({ userId: row.user_id as string, fullName: row.full_name as string }))
}

export interface ItemInput {
  title: string
  category: ItemCategory
  colors: ItemColor[]
  brand: string
  foundOn: string
  foundLocation: string
  storageLocation: string
  publicDescription: string
  identifyingFeature: string
  internalNote: string
  isPublic: boolean
  photoPath: string | null
}

export const saveItem = async (id: string | null, input: ItemInput): Promise<{ id: string; itemNumber: string }> =>
  unwrap(
    await supabase.rpc('save_item', {
      p_item_id: id,
      p_title: input.title,
      p_category: input.category,
      p_colors: input.colors,
      p_brand: input.brand,
      p_found_on: input.foundOn,
      p_found_location: input.foundLocation,
      p_storage_location: input.storageLocation,
      p_public_description: input.publicDescription,
      p_identifying_feature: input.identifyingFeature,
      p_internal_note: input.internalNote,
      p_is_public: input.isPublic,
      p_photo_path: input.photoPath,
    }),
  ) as { id: string; itemNumber: string }

export const setItemStatus = async (id: string, status: ItemStatus): Promise<void> => {
  unwrap(await supabase.rpc('set_item_status', { p_item_id: id, p_status: status }))
}

export interface ReportMatch {
  reportId: string
  title: string
  category: ItemCategory
  colors: ItemColor[]
  lostFrom: string
  lostTo: string
  lostLocation: string
  isUnknownOffice: boolean
  createdAt: string
  score: number
  reasons: string[]
  notifiedAt: string | null
  source: 'regel' | 'ki'
}

export const matchForItem = async (id: string): Promise<ReportMatch[]> =>
  unwrap(await supabase.rpc('match_for_item', { p_item_id: id })) as ReportMatch[]

export interface MatchCounts {
  reports: Record<string, number>
  items: Record<string, number>
}

export const getMatchCounts = async (): Promise<MatchCounts> => unwrap(await supabase.rpc('staff_match_counts')) as MatchCounts

export const listLossReports = async (): Promise<LossReport[]> => {
  const rows = unwrap(await supabase.from('loss_reports').select('*').order('created_at', { ascending: false })) as Rows
  return rows.map(toLossReport)
}

export const getLossReport = async (id: string): Promise<LossReport | null> => {
  const row = unwrap(await supabase.from('loss_reports').select('*').eq('id', id).maybeSingle()) as Rows[number] | null
  return row ? toLossReport(row) : null
}

export const matchForLoss = async (id: string): Promise<MatchItem[]> =>
  (unwrap(await supabase.rpc('match_for_loss', { p_report_id: id })) as Rows).map(toMatchItem)

export const notifyMatch = async (reportId: string, itemId: string): Promise<boolean> =>
  unwrap(await supabase.rpc('notify_loss_match', { p_report_id: reportId, p_item_id: itemId })) as boolean

export const closeLossReport = async (id: string): Promise<void> => {
  unwrap(await supabase.rpc('close_loss_report', { p_report_id: id }))
}

export const listClaims = async (): Promise<Claim[]> => {
  const rows = unwrap(await supabase.from('return_requests').select('*').order('created_at', { ascending: false })) as Rows
  return rows.map(toClaim)
}

export const decideClaim = async (id: string, confirm: boolean, text: string): Promise<void> => {
  unwrap(await supabase.rpc('decide_claim', { p_claim_id: id, p_confirm: confirm, p_text: text }))
}

export const completeClaim = async (id: string): Promise<void> => {
  unwrap(await supabase.rpc('complete_claim', { p_claim_id: id }))
}

export const listOutbox = async (): Promise<Email[]> => {
  const rows = unwrap(await supabase.from('simulated_emails').select('*').order('created_at', { ascending: false }).limit(200)) as Rows
  return rows.map(toEmail)
}

export interface OfficeProfileInput {
  dropOffLocation: string
  openingHours: string
  pickupRules: string
  contactEmail: string
  contactPhone: string
  retentionDays: number
}

export const updateOfficeProfile = async (input: OfficeProfileInput): Promise<void> => {
  unwrap(
    await supabase.rpc('update_organisation_profile', {
      p_drop_off_location: input.dropOffLocation,
      p_opening_hours: input.openingHours,
      p_pickup_rules: input.pickupRules,
      p_contact_email: input.contactEmail,
      p_contact_phone: input.contactPhone,
      p_retention_days: input.retentionDays,
    }),
  )
}

export const resetDemo = async (): Promise<void> => {
  unwrap(await supabase.rpc('reset_demo'))
}

export interface AiStats {
  /** KI-Treffer im eigenen Bestand (30 Tage), die die Regeln nicht gefunden hätten */
  kiOnlyMatches: number
  /** Mit KI ausgefüllte Formulare der Fundstelle (30 Tage) */
  assistedForms: number
}

export const getAiStats = async (): Promise<AiStats> => unwrap(await supabase.rpc('ai_stats')) as AiStats
