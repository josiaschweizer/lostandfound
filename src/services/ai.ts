import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { FoundDescription, LostDescription, SearchCandidate } from '@/domain/aiMatching'
import type { ItemCategory, ItemColor, ItemStatus } from '@/domain/types'
import { AppError, toUserMessage } from './errors'

/**
 * Zugriff auf die KI über die Edge Function «ai».
 * Der API-Key liegt nur auf dem Server; hier werden ausschliesslich Aufgaben und
 * öffentliche bzw. bewusst ausgewählte Angaben übergeben – nie interne Merkmale.
 */
const invokeAi = async <T>(task: string, payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<T>('ai', { body: { task, ...payload } })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null
      if (body?.error) throw new AppError(body.error, { cause: error })
    }
    throw new AppError(`KI nicht verfügbar: ${toUserMessage(error)}`, { cause: error })
  }
  if (data === null) throw new AppError('Die KI hat keine Antwort geliefert.')
  return data
}

// --- Öffentlich -------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatItem {
  id: string
  itemNumber: string
  title: string
  category: ItemCategory
  color: ItemColor
  foundOn: string
  foundLocation: string
  organisationName: string | null
  photoPath: string | null
  status: ItemStatus
}

export interface ChatReply {
  reply: string
  items: ChatItem[]
}

export const sendChat = (messages: ChatMessage[]): Promise<ChatReply> => invokeAi<ChatReply>('chat', { messages })


export interface LossReportDraft {
  title: string | null
  category: ItemCategory | null
  color: ItemColor | null
  brand: string | null
  lostOn: string | null
  lostLocation: string | null
  description: string | null
}

export const parseLossReport = async (text: string): Promise<LossReportDraft> =>
  (await invokeAi<{ draft: LossReportDraft }>('parse-loss-report', { text })).draft

// --- Mitarbeitende ----------------------------------------------------------

export interface DescribeItemInput {
  title: string
  category: string
  color: string
  brand: string
  foundLocation: string
  /** Bisheriger Text oder Stichworte. */
  notes: string
}

export const suggestItemDescription = async (input: DescribeItemInput): Promise<string> =>
  (await invokeAi<{ text: string }>('describe-item', { ...input })).text

export interface DraftMessageInput {
  kind: 'confirm' | 'reject'
  itemTitle: string
  itemNumber: string
  officeName: string
  officeLocation: string
  openingHours: string
  pickupNotes: string
  /** Stichworte der Mitarbeitenden. */
  notes: string
}

export const draftDecisionText = async (input: DraftMessageInput): Promise<string> =>
  (await invokeAi<{ text: string }>('draft-message', { ...input })).text

// --- KI-Abgleich (öffentlich und Mitarbeitende) -------------------------------

export interface RankedMatch {
  id: string
  /** Einschätzung der KI, 0–100 */
  score: number
  reason: string
}

/**
 * Bewertet Kandidaten gegenüber genau einem Eintrag: entweder eine Verlustmeldung gegen
 * mehrere Funde oder ein Fund gegen mehrere Verlustmeldungen.
 */
export const rankMatches = async (input: { lost: LostDescription[]; found: FoundDescription[] }): Promise<RankedMatch[]> =>
  (await invokeAi<{ matches: RankedMatch[] }>('rank-matches', { ...input })).matches

// --- Foto auswerten (Mitarbeitende) ------------------------------------------

export interface PhotoAnalysis {
  title: string | null
  category: ItemCategory | null
  color: ItemColor | null
  brand: string | null
  description: string | null
  /** Hinweise auf sichtbare persönliche Angaben auf dem Foto. */
  warnings: string[]
}

/** `image` ist eine Data-URL (JPEG/PNG/WebP), siehe photoToDataUrl. */
export const analyzePhoto = async (image: string): Promise<PhotoAnalysis> =>
  (await invokeAi<{ analysis: PhotoAnalysis }>('analyze-photo', { image })).analysis

// --- KI-Suche (öffentlich) -----------------------------------------------------

/** Bewertet zusätzliche Kandidaten für eine Suchanfrage; nur Treffer ab Score 50 kommen zurück. */
export const searchWithAi = async (query: string, items: SearchCandidate[]): Promise<RankedMatch[]> =>
  (await invokeAi<{ matches: RankedMatch[] }>('search-items', { query, items })).matches
