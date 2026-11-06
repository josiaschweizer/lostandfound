import type {
  Claim, Email, ItemCategory, ItemColor, ItemHistoryEntry, ItemStatus, LossReport, MatchItem, Organisation, PublicItem, StaffItem,
} from '@/domain/types'

/** Zeilen aus PostgREST (snake_case) → Fachobjekte (camelCase). */
type Row = Record<string, unknown>

const str = (row: Row, key: string) => row[key] as string
const strOrNull = (row: Row, key: string) => (row[key] ?? null) as string | null

export const toOrganisation = (row: Row): Organisation => ({
  id: str(row, 'id'),
  slug: str(row, 'slug'),
  name: str(row, 'name'),
  type: row.type as Organisation['type'],
  shortCode: str(row, 'short_code'),
  address: str(row, 'address'),
  dropOffLocation: str(row, 'drop_off_location'),
  openingHours: str(row, 'opening_hours'),
  pickupRules: strOrNull(row, 'pickup_rules'),
  contactEmail: str(row, 'contact_email'),
  contactPhone: strOrNull(row, 'contact_phone'),
  retentionDays: row.retention_days as number,
})

export const toPublicItem = (row: Row): PublicItem => ({
  id: str(row, 'id'),
  organisationId: str(row, 'organisation_id'),
  itemNumber: str(row, 'item_number'),
  title: str(row, 'title'),
  category: row.category as ItemCategory,
  colors: (row.colors ?? []) as ItemColor[],
  brand: strOrNull(row, 'brand'),
  foundOn: str(row, 'found_on'),
  foundLocation: str(row, 'found_location'),
  publicDescription: str(row, 'public_description') ?? '',
  photoPath: strOrNull(row, 'photo_path'),
  status: row.status as ItemStatus,
  createdAt: str(row, 'created_at'),
})

export const toStaffItem = (row: Row): StaffItem => {
  const internalRaw = row.found_item_internal as Row | Row[] | null
  const internal = (Array.isArray(internalRaw) ? internalRaw[0] : internalRaw) ?? {}
  return {
    ...toPublicItem(row),
    isPublic: row.is_public as boolean,
    createdBy: strOrNull(row, 'created_by'),
    updatedAt: str(row, 'updated_at'),
    identifyingFeature: (internal.identifying_feature as string) ?? '',
    internalNote: (internal.internal_note as string) ?? '',
    storageLocation: (internal.storage_location as string) ?? '',
  }
}

/** Treffer aus den RPCs (bereits camelCase). */
export const toMatchItem = (row: Row): MatchItem => ({
  id: str(row, 'id'),
  organisationId: str(row, 'organisationId'),
  organisationName: str(row, 'organisationName'),
  organisationSlug: str(row, 'organisationSlug'),
  itemNumber: str(row, 'itemNumber'),
  title: str(row, 'title'),
  category: row.category as ItemCategory,
  colors: (row.colors ?? []) as ItemColor[],
  brand: strOrNull(row, 'brand'),
  foundOn: str(row, 'foundOn'),
  foundLocation: str(row, 'foundLocation'),
  publicDescription: (row.publicDescription as string) ?? '',
  photoPath: strOrNull(row, 'photoPath'),
  status: row.status as ItemStatus,
  reasons: (row.reasons ?? []) as string[],
  score: row.score as number | undefined,
  isPublic: row.isPublic as boolean | undefined,
  notifiedAt: (row.notifiedAt ?? null) as string | null,
})

export const toLossReport = (row: Row): LossReport => ({
  id: str(row, 'id'),
  organisationId: strOrNull(row, 'organisation_id'),
  reporterName: strOrNull(row, 'reporter_name'),
  reporterEmail: str(row, 'reporter_email'),
  title: str(row, 'title'),
  category: row.category as ItemCategory,
  colors: (row.colors ?? []) as ItemColor[],
  brand: strOrNull(row, 'brand'),
  description: str(row, 'description') ?? '',
  privateFeature: str(row, 'private_feature') ?? '',
  lostLocation: str(row, 'lost_location') ?? '',
  lostFrom: str(row, 'lost_from'),
  lostTo: str(row, 'lost_to'),
  lostDateUncertain: Boolean(row.lost_date_uncertain),
  status: row.status as LossReport['status'],
  createdAt: str(row, 'created_at'),
  closedAt: strOrNull(row, 'closed_at'),
})

export const toClaim = (row: Row): Claim => ({
  id: str(row, 'id'),
  itemId: str(row, 'item_id'),
  organisationId: str(row, 'organisation_id'),
  claimantName: str(row, 'claimant_name'),
  claimantEmail: str(row, 'claimant_email'),
  claimantPhone: strOrNull(row, 'claimant_phone'),
  message: str(row, 'message') ?? '',
  recognitionText: str(row, 'recognition_text'),
  pickupByOther: Boolean(row.pickup_by_other),
  pickupPersonName: strOrNull(row, 'pickup_person_name'),
  status: row.status as Claim['status'],
  pickupInstructions: strOrNull(row, 'pickup_instructions'),
  decisionNote: strOrNull(row, 'decision_note'),
  createdAt: str(row, 'created_at'),
  confirmedAt: strOrNull(row, 'confirmed_at'),
  rejectedAt: strOrNull(row, 'rejected_at'),
  completedAt: strOrNull(row, 'completed_at'),
})

export const toEmail = (row: Row): Email => ({
  id: str(row, 'id'),
  recipient: str(row, 'recipient'),
  subject: str(row, 'subject'),
  body: str(row, 'body'),
  linkPath: strOrNull(row, 'link_path'),
  createdAt: str(row, 'created_at'),
  deliveryStatus: row.delivery_status as Email['deliveryStatus'],
  deliveryNote: strOrNull(row, 'delivery_note'),
  returnRequestId: strOrNull(row, 'return_request_id'),
  lossReportId: strOrNull(row, 'loss_report_id'),
})

export const toHistory = (row: Row): ItemHistoryEntry => ({
  id: row.id as number,
  field: str(row, 'field'),
  oldValue: strOrNull(row, 'old_value'),
  newValue: strOrNull(row, 'new_value'),
  changedAt: str(row, 'changed_at'),
  changedBy: strOrNull(row, 'changed_by'),
})
