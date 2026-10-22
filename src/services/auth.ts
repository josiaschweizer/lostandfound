import { supabase } from '@/lib/supabase'
import type { OrganisationType, StaffMember } from '@/domain/types'
import { AppError, ensureOk, unwrap } from './errors'

export const signIn = async (email: string, password: string): Promise<void> => {
  unwrap(await supabase.auth.signInWithPassword({ email, password }))
}

/**
 * Erstellt ein Konto (Schritt 1). E-Mail-Bestätigung muss im Supabase-Projekt
 * deaktiviert sein, damit direkt eine Sitzung entsteht und keine echte Mail verschickt wird.
 */
export const signUp = async (fullName: string, email: string, password: string): Promise<void> => {
  const data = unwrap(
    await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } }),
  )
  if (!data.session) {
    throw new AppError(
      'Konto erstellt, aber keine Sitzung erhalten. Bitte im Supabase-Projekt «Confirm email» deaktivieren (siehe README).',
    )
  }
}

export const signOut = async (): Promise<void> => {
  ensureOk(await supabase.auth.signOut())
}

export const getMembership = async (userId: string): Promise<StaffMember | null> => {
  const row = unwrap(await supabase.from('memberships').select('*').eq('user_id', userId).maybeSingle())
  return row ? { userId: row.user_id, organisationId: row.organisation_id, fullName: row.full_name } : null
}

export interface OrganisationRegistration {
  fullName: string
  organisationName: string
  organisationType: OrganisationType
  address: string
  officeName: string
  officeLocation: string
  contactEmail: string
  contactPhone: string
  openingHours: string
  pickupNotes: string
}

/** Legt Organisation, Fundstelle und Mitgliedschaft an. Liefert den Slug der öffentlichen Seite. */
export const registerOrganisation = async (input: OrganisationRegistration): Promise<string> =>
  unwrap(
    await supabase.rpc('register_organisation', {
      p_full_name: input.fullName,
      p_org_name: input.organisationName,
      p_org_type: input.organisationType,
      p_address: input.address,
      p_office_name: input.officeName,
      p_office_location: input.officeLocation,
      p_contact_email: input.contactEmail,
      p_contact_phone: input.contactPhone,
      p_opening_hours: input.openingHours,
      p_pickup_notes: input.pickupNotes,
    }),
  )
