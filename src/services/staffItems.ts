import { supabase } from '@/lib/supabase'
import type { InternalItemDetails, ItemCategory, ItemColor, ItemStatus, StaffItem } from '@/domain/types'
import { unwrap } from './errors'
import { PUBLIC_ITEM_COLUMNS, toFoundItem, toInternal } from './mappers'

/** Gegenstände der eigenen Organisation inkl. interner Angaben (RLS: nur eigene Org). */

const SELECT = `${PUBLIC_ITEM_COLUMNS}, found_item_internal(*)`

type RowWithInternal = Parameters<typeof toFoundItem>[0] & {
  found_item_internal: Parameters<typeof toInternal>[0] | Parameters<typeof toInternal>[0][] | null
}

const toStaffItem = (row: RowWithInternal): StaffItem => {
  const internal = Array.isArray(row.found_item_internal) ? row.found_item_internal[0] : row.found_item_internal
  return { ...toFoundItem(row), internal: toInternal(internal) }
}

export const listStaffItems = async (organisationId: string): Promise<StaffItem[]> => {
  const rows = unwrap(
    await supabase
      .from('found_items')
      .select(SELECT)
      .eq('organisation_id', organisationId)
      .order('found_on', { ascending: false })
      .order('created_at', { ascending: false }),
  )
  return (rows as unknown as RowWithInternal[]).map(toStaffItem)
}

export const getStaffItem = async (organisationId: string, id: string): Promise<StaffItem | null> => {
  const row = unwrap(
    await supabase.from('found_items').select(SELECT).eq('organisation_id', organisationId).eq('id', id).maybeSingle(),
  )
  return row ? toStaffItem(row as unknown as RowWithInternal) : null
}

export interface ItemInput {
  title: string
  category: ItemCategory
  color: ItemColor
  brand: string
  foundOn: string
  foundLocation: string
  publicDescription: string
  photoPath: string | null
  isPublic: boolean
  internal: InternalItemDetails
}

const toPublicColumns = (input: ItemInput) => ({
  title: input.title.trim(),
  category: input.category,
  color: input.color,
  brand: input.brand.trim() || null,
  found_on: input.foundOn,
  found_location: input.foundLocation.trim(),
  public_description: input.publicDescription.trim(),
  photo_path: input.photoPath,
  is_public: input.isPublic,
})

const saveInternal = async (organisationId: string, itemId: string, internal: InternalItemDetails) => {
  unwrap(
    await supabase.from('found_item_internal').upsert({
      item_id: itemId,
      organisation_id: organisationId,
      identifying_feature: internal.identifyingFeature.trim(),
      internal_note: internal.internalNote.trim(),
      storage_location: internal.storageLocation.trim(),
    }),
  )
}

/** Erfasst einen Gegenstand. Die Fundnummer vergibt die Datenbank. */
export const createItem = async (organisationId: string, input: ItemInput): Promise<string> => {
  const row = unwrap(
    await supabase
      .from('found_items')
      .insert({ organisation_id: organisationId, ...toPublicColumns(input) })
      .select('id')
      .single(),
  )
  await saveInternal(organisationId, row.id, input.internal)
  return row.id
}

export const updateItem = async (organisationId: string, id: string, input: ItemInput): Promise<void> => {
  unwrap(await supabase.from('found_items').update(toPublicColumns(input)).eq('id', id))
  await saveInternal(organisationId, id, input.internal)
}

export const changeItemStatus = async (id: string, status: ItemStatus): Promise<void> => {
  unwrap(await supabase.rpc('change_item_status', { p_item_id: id, p_status: status }))
}
