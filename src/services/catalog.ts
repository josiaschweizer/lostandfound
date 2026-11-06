import { supabase } from '@/lib/supabase'
import type { Organisation, PublicItem } from '@/domain/types'
import type { SynonymGroups } from '@/domain/search'
import { unwrap } from './errors'
import { toOrganisation, toPublicItem } from './mappers'

/** Öffentlicher Katalog (View public_items: nur öffentliche Angaben, nur offene/reservierte Funde). */
export const listPublicItems = async (): Promise<PublicItem[]> => {
  const rows = unwrap(await supabase.from('public_items').select('*').order('found_on', { ascending: false }).order('created_at', { ascending: false }))
  return (rows as Record<string, unknown>[]).map(toPublicItem)
}

export const getPublicItemByNumber = async (itemNumber: string): Promise<PublicItem | null> => {
  const row = unwrap(await supabase.from('public_items').select('*').eq('item_number', itemNumber).maybeSingle())
  return row ? toPublicItem(row as Record<string, unknown>) : null
}

export const listOffices = async (): Promise<Organisation[]> => {
  const rows = unwrap(await supabase.from('organisations').select('*').order('name'))
  return (rows as Record<string, unknown>[]).map(toOrganisation)
}

export const listSynonyms = async (): Promise<SynonymGroups> => {
  const rows = unwrap(await supabase.from('search_synonyms').select('group_id, term')) as { group_id: number; term: string }[]
  const groups = new Map<number, string[]>()
  for (const row of rows) groups.set(row.group_id, [...(groups.get(row.group_id) ?? []), row.term])
  return [...groups.values()]
}
