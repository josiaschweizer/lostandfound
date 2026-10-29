import type { Database } from '@/lib/database.types'

type Enums = Database['public']['Enums']

export type OrganisationType = Enums['organisation_type']
export type ItemCategory = Enums['item_category']
export type ItemColor = Enums['item_color']
export type ItemStatus = Enums['item_status']
export type RequestStatus = Enums['request_status']
export type LossReportStatus = Enums['loss_report_status']
export type EmailDeliveryStatus = Enums['email_delivery_status']

export interface Organisation {
  id: string
  slug: string
  name: string
  type: OrganisationType
  shortCode: string
  address: string
}

/** Fundstelle: Ort, der die Gegenstände einer Organisation verwaltet. */
export interface FoundOffice {
  id: string
  organisationId: string
  name: string
  location: string
  contactEmail: string
  contactPhone: string | null
  openingHours: string
  pickupNotes: string | null
}

export interface OrganisationWithOffice extends Organisation {
  office: FoundOffice
}

export interface FoundItem {
  id: string
  organisationId: string
  itemNumber: string
  title: string
  category: ItemCategory
  color: ItemColor
  brand: string | null
  foundOn: string
  foundLocation: string
  publicDescription: string
  photoPath: string | null
  status: ItemStatus
  isPublic: boolean
  createdAt: string
}

/** Nur für Mitarbeitende der eigenen Organisation. */
export interface InternalItemDetails {
  identifyingFeature: string
  internalNote: string
  storageLocation: string
}

export interface StaffItem extends FoundItem {
  internal: InternalItemDetails
}

export interface ReturnRequest {
  id: string
  itemId: string
  organisationId: string
  claimantName: string
  claimantContact: string
  message: string
  proofDescription: string
  status: RequestStatus
  pickupInstructions: string | null
  decisionNote: string | null
  createdAt: string
  decidedAt: string | null
}

export interface LossReport {
  id: string
  organisationId: string | null
  reporterName: string
  reporterContact: string
  title: string
  category: ItemCategory
  color: ItemColor
  brand: string | null
  lostOn: string
  lostLocation: string
  description: string
  status: LossReportStatus
  createdAt: string
}

/** Nachricht im Postausgang. Wird zusätzlich echt versendet, wenn der Versand konfiguriert ist. */
export interface SimulatedEmail {
  id: string
  returnRequestId: string | null
  lossReportId: string | null
  recipient: string
  subject: string
  body: string
  linkPath: string | null
  createdAt: string
  deliveryStatus: EmailDeliveryStatus
  deliveryNote: string | null
  sentAt: string | null
}

export interface StaffMember {
  userId: string
  organisationId: string
  fullName: string
}
