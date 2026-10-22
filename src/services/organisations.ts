import { supabase } from '@/lib/supabase'
import type { FoundOffice, OrganisationWithOffice } from '@/domain/types'
import { AppError, unwrap } from './errors'
import { toOffice, toOrganisation } from './mappers'

const SELECT = '*, found_offices(*)'

type OrgRowWithOffice = Parameters<typeof toOrganisation>[0] & {
  found_offices: Parameters<typeof toOffice>[0] | Parameters<typeof toOffice>[0][] | null
}

const toOrganisationWithOffice = (row: OrgRowWithOffice): OrganisationWithOffice => {
  const office = Array.isArray(row.found_offices) ? row.found_offices[0] : row.found_offices
  if (!office) throw new AppError(`Für «${row.name}» ist keine Fundstelle erfasst.`)
  return { ...toOrganisation(row), office: toOffice(office) }
}

export const listOrganisations = async (): Promise<OrganisationWithOffice[]> => {
  const rows = unwrap(await supabase.from('organisations').select(SELECT).order('name'))
  return (rows as unknown as OrgRowWithOffice[]).map(toOrganisationWithOffice)
}

export const getOrganisationBySlug = async (slug: string): Promise<OrganisationWithOffice | null> => {
  const row = unwrap(await supabase.from('organisations').select(SELECT).eq('slug', slug).maybeSingle())
  return row ? toOrganisationWithOffice(row as unknown as OrgRowWithOffice) : null
}

export const getOrganisationById = async (id: string): Promise<OrganisationWithOffice | null> => {
  const row = unwrap(await supabase.from('organisations').select(SELECT).eq('id', id).maybeSingle())
  return row ? toOrganisationWithOffice(row as unknown as OrgRowWithOffice) : null
}

export type OfficeUpdate = Pick<
  FoundOffice,
  'name' | 'location' | 'contactEmail' | 'contactPhone' | 'openingHours' | 'pickupNotes'
>

export const updateOffice = async (officeId: string, input: OfficeUpdate): Promise<void> => {
  unwrap(
    await supabase
      .from('found_offices')
      .update({
        name: input.name,
        location: input.location,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone || null,
        opening_hours: input.openingHours,
        pickup_notes: input.pickupNotes || null,
      })
      .eq('id', officeId),
  )
}
