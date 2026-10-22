import { supabase } from '@/lib/supabase'
import type { FoundItem } from '@/domain/types'
import { unwrap } from './errors'
import { PUBLIC_ITEM_COLUMNS, toFoundItem } from './mappers'

/**
 * Öffentlicher Fundkatalog. RLS liefert nur veröffentlichte, nicht zurückgegebene
 * Gegenstände; interne Angaben sind in einer separaten Tabelle und hier nie enthalten.
 * Für den Prototyp wird clientseitig gefiltert (wenige Datensätze).
 */
export const listPublicItems = async (): Promise<FoundItem[]> => {
  const rows = unwrap(
    await supabase
      .from('found_items')
      .select(PUBLIC_ITEM_COLUMNS)
      .eq('is_public', true)
      .neq('status', 'returned')
      .order('found_on', { ascending: false }),
  )
  return rows.map(toFoundItem)
}

export const getPublicItem = async (id: string): Promise<FoundItem | null> => {
  const row = unwrap(
    await supabase
      .from('found_items')
      .select(PUBLIC_ITEM_COLUMNS)
      .eq('id', id)
      .eq('is_public', true)
      .neq('status', 'returned')
      .maybeSingle(),
  )
  return row ? toFoundItem(row) : null
}
