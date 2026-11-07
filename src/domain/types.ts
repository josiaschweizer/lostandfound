/** Fachliche Typen (entsprechen den Enums und Tabellen in supabase/migrations). */
export const CATEGORIES = ['electronics', 'clothing', 'keys', 'bags', 'wallets', 'id_cards', 'jewellery', 'sports', 'other'] as const
export const COLORS = [
  'black', 'grey', 'white', 'beige', 'brown', 'red', 'pink', 'orange',
  'yellow', 'green', 'turquoise', 'blue', 'violet', 'silver', 'gold', 'multicolor',
] as const

export type ItemCategory = (typeof CATEGORIES)[number]
export type ItemColor = (typeof COLORS)[number]
export type ItemStatus = 'available' | 'reserved' | 'returned' | 'disposed'
export type ClaimStatus = 'open' | 'confirmed' | 'rejected' | 'completed'
export type LossStatus = 'open' | 'closed'
export type OrganisationType = 'school' | 'lost_property_office' | 'company' | 'leisure' | 'other'
export type MemberRole = 'staff' | 'admin'
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export const isCategory = (value: unknown): value is ItemCategory => typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
export const isColor = (value: unknown): value is ItemColor => typeof value === 'string' && (COLORS as readonly string[]).includes(value)

export interface Organisation {
  id: string
  slug: string
  name: string
  type: OrganisationType
  shortCode: string
  address: string
  dropOffLocation: string
  openingHours: string
  pickupRules: string | null
  contactEmail: string
  contactPhone: string | null
  retentionDays: number
}

/** Öffentliche Angaben eines Funds (View public_items). */
export interface PublicItem {
  id: string
  organisationId: string
  itemNumber: string
  title: string
  category: ItemCategory
  colors: ItemColor[]
  brand: string | null
  foundOn: string
  foundLocation: string
  publicDescription: string
  photoPath: string | null
  status: ItemStatus
  createdAt: string
}

/** Treffer aus dem Matching (öffentlich ohne Score). */
export interface MatchItem extends Omit<PublicItem, 'createdAt'> {
  organisationName: string
  organisationSlug: string
  reasons: string[]
  score?: number
  isPublic?: boolean
  notifiedAt?: string | null
  /** 'ki' = Vorschlag der KI (semantic_match), sonst Regel-Treffer */
  source?: 'regel' | 'ki'
}

export interface StaffItem extends PublicItem {
  isPublic: boolean
  createdBy: string | null
  updatedAt: string
  identifyingFeature: string
  internalNote: string
  storageLocation: string
}

export interface ItemHistoryEntry {
  id: number
  field: string
  oldValue: string | null
  newValue: string | null
  changedAt: string
  changedBy: string | null
}

export interface LossReport {
  id: string
  organisationId: string | null
  reporterName: string | null
  reporterEmail: string
  title: string
  category: ItemCategory
  colors: ItemColor[]
  brand: string | null
  description: string
  privateFeature: string
  lostLocation: string
  lostFrom: string
  lostTo: string
  lostDateUncertain: boolean
  status: LossStatus
  createdAt: string
  closedAt: string | null
}

export interface Claim {
  id: string
  itemId: string
  organisationId: string
  claimantName: string
  claimantEmail: string
  claimantPhone: string | null
  message: string
  recognitionText: string
  pickupByOther: boolean
  pickupPersonName: string | null
  status: ClaimStatus
  pickupInstructions: string | null
  decisionNote: string | null
  createdAt: string
  confirmedAt: string | null
  rejectedAt: string | null
  completedAt: string | null
}

export interface Email {
  id: string
  recipient?: string
  subject: string
  body: string
  linkPath: string | null
  createdAt: string
  deliveryStatus: DeliveryStatus
  deliveryNote?: string | null
  returnRequestId?: string | null
  lossReportId?: string | null
}
