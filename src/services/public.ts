import { supabase } from '@/lib/supabase'
import type { ClaimStatus, Email, ItemCategory, ItemColor, LossStatus, MatchItem } from '@/domain/types'
import { unwrap } from './errors'
import { toMatchItem } from './mappers'

/** Abläufe ohne Konto: Verlust melden, «Das gehört mir», persönliche Links. */

export interface LossReportInput {
  organisationId: string | null
  title: string
  category: ItemCategory
  colors: ItemColor[]
  brand: string
  description: string
  privateFeature: string
  lostLocation: string
  lostFrom: string | null
  lostTo: string | null
  lostDateUncertain: boolean
  email: string
  name: string
}

export const createLossReport = async (input: LossReportInput): Promise<string> =>
  unwrap(
    await supabase.rpc('create_loss_report', {
      p_organisation_id: input.organisationId,
      p_title: input.title,
      p_category: input.category,
      p_colors: input.colors,
      p_brand: input.brand,
      p_description: input.description,
      p_private_feature: input.privateFeature,
      p_lost_location: input.lostLocation,
      p_lost_from: input.lostFrom,
      p_lost_to: input.lostTo,
      p_lost_date_uncertain: input.lostDateUncertain,
      p_email: input.email,
      p_name: input.name,
    }),
  ) as string

export type DraftCriteria = Pick<LossReportInput, 'organisationId' | 'title' | 'category' | 'colors' | 'brand' | 'description' | 'lostLocation' | 'lostFrom' | 'lostTo'>

export const matchDraft = async (draft: DraftCriteria): Promise<MatchItem[]> => {
  const rows = unwrap(
    await supabase.rpc('match_for_draft', {
      p_organisation_id: draft.organisationId,
      p_title: draft.title,
      p_category: draft.category,
      p_colors: draft.colors,
      p_brand: draft.brand,
      p_description: draft.description,
      p_lost_location: draft.lostLocation,
      p_lost_from: draft.lostFrom,
      p_lost_to: draft.lostTo,
    }),
  ) as Record<string, unknown>[]
  return rows.map(toMatchItem)
}

export interface MyLoss {
  id: string
  organisationId: string | null
  organisationName: string | null
  title: string
  category: ItemCategory
  colors: ItemColor[]
  brand: string | null
  description: string
  lostLocation: string
  lostFrom: string
  lostTo: string
  lostDateUncertain: boolean
  reporterName: string | null
  status: LossStatus
  createdAt: string
  closedAt: string | null
  matches: MatchItem[]
  emails: Email[]
}

export const getMyLoss = async (token: string): Promise<MyLoss | null> => {
  const data = unwrap(await supabase.rpc('get_my_loss', { p_token: token })) as (Omit<MyLoss, 'matches'> & { matches: Record<string, unknown>[] }) | null
  return data ? { ...data, matches: data.matches.map(toMatchItem) } : null
}

export const closeMyLoss = async (token: string): Promise<boolean> => unwrap(await supabase.rpc('close_my_loss', { p_token: token })) as boolean

export interface ClaimInput {
  itemId: string
  recognitionText: string
  email: string
  name: string
  phone: string
  message: string
  pickupByOther: boolean
  pickupPersonName: string
}

export const createClaim = async (input: ClaimInput): Promise<string> =>
  unwrap(
    await supabase.rpc('create_claim', {
      p_item_id: input.itemId,
      p_recognition_text: input.recognitionText,
      p_email: input.email,
      p_name: input.name,
      p_phone: input.phone,
      p_message: input.message,
      p_pickup_by_other: input.pickupByOther,
      p_pickup_person_name: input.pickupPersonName,
    }),
  ) as string

export interface MyClaim {
  status: ClaimStatus
  claimantName: string
  pickupByOther: boolean
  pickupPersonName: string | null
  pickupInstructions: string | null
  decisionNote: string | null
  createdAt: string
  confirmedAt: string | null
  rejectedAt: string | null
  completedAt: string | null
  item: { id: string; title: string; itemNumber: string; category: ItemCategory; colors: ItemColor[]; photoPath: string | null }
  office: {
    name: string
    slug: string
    address: string
    contactEmail: string
    dropOffLocation: string | null
    openingHours: string | null
    pickupRules: string | null
  }
  emails: Email[]
}

export const getMyClaim = async (token: string): Promise<MyClaim | null> =>
  unwrap(await supabase.rpc('get_my_claim', { p_token: token })) as MyClaim | null
