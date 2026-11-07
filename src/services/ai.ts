import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ItemCategory, ItemColor } from '@/domain/types'
import { AppError } from './errors'

/**
 * Zugriff auf die Edge Function «ai». Der KI-Schlüssel liegt nur als Supabase-Secret auf dem Server.
 * An die KI gehen nur Gegenstandsbeschreibungen (und bei Fundstellen das Foto) – nie Kontaktdaten,
 * interne Merkmale oder Notizen.
 */
import { downscaleImage } from './photos'

export type AiFeature = 'extract_fields' | 'photo_suggest' | 'semantic_match' | 'expand_query'

export interface AiStatus {
  enabled: boolean
  features: string[]
}

export const getAiStatus = async (): Promise<AiStatus> => {
  try {
    const { data, error } = await supabase.functions.invoke<AiStatus>('ai', { body: { action: 'status' } })
    if (error || !data) return { enabled: false, features: [] }
    return { enabled: Boolean(data.enabled), features: Array.isArray(data.features) ? data.features : [] }
  } catch {
    return { enabled: false, features: [] }
  }
}

export interface ExtractedFields {
  titel: string | null
  kategorie: ItemCategory | null
  farben: ItemColor[]
  marke: string | null
  beschreibung: string | null
  ort: string | null
  datum_von: string | null
  datum_bis: string | null
  unsicher: string[]
}

const invokeAi = async <T>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<T>('ai', { body })
  if (error) {
    const details = error instanceof FunctionsHttpError ? ((await error.context.json().catch(() => null)) as { error?: string } | null) : null
    throw new AppError(details?.error ?? 'KI nicht verfügbar', { cause: error })
  }
  if (!data) throw new AppError('Die KI hat keine Antwort geliefert.')
  return data
}

export const extractFields = async (text: string, context: 'verlust' | 'fund'): Promise<ExtractedFields> => {
  const data = await invokeAi<{ fields?: ExtractedFields }>({ action: 'extract_fields', text, context })
  if (!data.fields) throw new AppError('Die KI hat keine Antwort geliefert.')
  return data.fields
}

const toDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Foto konnte nicht gelesen werden.'))
    reader.readAsDataURL(blob)
  })

/** Foto → Vorschlag für Titel, Kategorie, Farben, Marke, Beschreibung (nur Fundstellen). Verkleinert auf 768 px. */
export const photoSuggest = async (file: Blob): Promise<ExtractedFields> => {
  const image = await toDataUrl(await downscaleImage(file, 768, 0.7))
  const data = await invokeAi<{ fields?: ExtractedFields }>({ action: 'photo_suggest', image })
  if (!data.fields) throw new AppError('Die KI hat keine Antwort geliefert.')
  return data.fields
}

/** KI-Treffer berechnen und speichern. Liefert die Anzahl gespeicherter Vorschläge. */
export const runSemanticMatch = async (target: { token: string } | { lossId: string } | { itemId: string }): Promise<number> =>
  (await invokeAi<{ stored?: number }>({ action: 'semantic_match', ...target })).stored ?? 0

export interface QueryExpansion {
  terms: string[]
  category: ItemCategory | null
}

/** Weitere Suchbegriffe für eine Suche mit wenig Treffern (serverseitig 7 Tage zwischengespeichert). */
export const expandQuery = async (query: string): Promise<QueryExpansion> => {
  const data = await invokeAi<{ terms?: string[]; category?: ItemCategory | null }>({ action: 'expand_query', query })
  return { terms: Array.isArray(data.terms) ? data.terms : [], category: data.category ?? null }
}
