import type { Database } from '@/lib/database.types'
import type {
  FoundItem,
  FoundOffice,
  InternalItemDetails,
  LossReport,
  Organisation,
  ReturnRequest,
  SimulatedEmail,
} from '@/domain/types'

type Tables = Database['public']['Tables']
type Row<T extends keyof Tables> = Tables[T]['Row']

/** Spalten, die auch anonyme Personen lesen dürfen (siehe RLS-Migration). */
export const PUBLIC_ITEM_COLUMNS =
  'id, organisation_id, item_number, title, category, color, brand, found_on, found_location, public_description, photo_path, status, is_public, created_at'

export const toOrganisation = (row: Row<'organisations'>): Organisation => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  type: row.type,
  shortCode: row.short_code,
  address: row.address,
})

export const toOffice = (row: Row<'found_offices'>): FoundOffice => ({
  id: row.id,
  organisationId: row.organisation_id,
  name: row.name,
  location: row.location,
  contactEmail: row.contact_email,
  contactPhone: row.contact_phone,
  openingHours: row.opening_hours,
  pickupNotes: row.pickup_notes,
})

type PublicItemRow = Omit<Row<'found_items'>, 'updated_at'>

export const toFoundItem = (row: PublicItemRow): FoundItem => ({
  id: row.id,
  organisationId: row.organisation_id,
  itemNumber: row.item_number,
  title: row.title,
  category: row.category,
  color: row.color,
  brand: row.brand,
  foundOn: row.found_on,
  foundLocation: row.found_location,
  publicDescription: row.public_description,
  photoPath: row.photo_path,
  status: row.status,
  isPublic: row.is_public,
  createdAt: row.created_at,
})

const EMPTY_INTERNAL: InternalItemDetails = { identifyingFeature: '', internalNote: '', storageLocation: '' }

export const toInternal = (row: Row<'found_item_internal'> | null | undefined): InternalItemDetails =>
  row
    ? {
        identifyingFeature: row.identifying_feature,
        internalNote: row.internal_note,
        storageLocation: row.storage_location,
      }
    : EMPTY_INTERNAL

export const toReturnRequest = (row: Row<'return_requests'>): ReturnRequest => ({
  id: row.id,
  itemId: row.item_id,
  organisationId: row.organisation_id,
  claimantName: row.claimant_name,
  claimantContact: row.claimant_contact,
  message: row.message,
  proofDescription: row.proof_description,
  status: row.status,
  pickupInstructions: row.pickup_instructions,
  decisionNote: row.decision_note,
  createdAt: row.created_at,
  decidedAt: row.decided_at,
})

export const toLossReport = (row: Row<'loss_reports'>): LossReport => ({
  id: row.id,
  organisationId: row.organisation_id,
  reporterName: row.reporter_name,
  reporterContact: row.reporter_contact,
  title: row.title,
  category: row.category,
  color: row.color,
  brand: row.brand,
  lostOn: row.lost_on,
  lostLocation: row.lost_location,
  description: row.description,
  status: row.status,
  createdAt: row.created_at,
})

export const toEmail = (row: Row<'simulated_emails'>): SimulatedEmail => ({
  id: row.id,
  returnRequestId: row.return_request_id,
  lossReportId: row.loss_report_id,
  recipient: row.recipient,
  subject: row.subject,
  body: row.body,
  linkPath: row.link_path,
  createdAt: row.created_at,
  deliveryStatus: row.delivery_status,
  deliveryNote: row.delivery_note,
  sentAt: row.sent_at,
})
