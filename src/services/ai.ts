import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ItemCategory, ItemColor } from '@/domain/types'
import { AppError } from './errors'

/**
 * Zugriff auf die Edge Function «ai». Der KI-Schlüssel liegt nur als Supabase-Secret auf dem Server.
 * An die KI geht nur der Text aus «In eigenen Worten beschreiben» – nie Kontaktdaten oder interne Angaben.
 */

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

export const extractFields = async (text: string, context: 'verlust' | 'fund'): Promise<ExtractedFields> => {
  const { data, error } = await supabase.functions.invoke<{ fields: ExtractedFields }>('ai', {
    body: { action: 'extract_fields', text, context },
  })
  if (error) {
    const body = error instanceof FunctionsHttpError ? ((await error.context.json().catch(() => null)) as { error?: string } | null) : null
    throw new AppError(body?.error ?? 'KI nicht verfügbar', { cause: error })
  }
  if (!data?.fields) throw new AppError('Die KI hat keine Antwort geliefert.')
  return data.fields
}
