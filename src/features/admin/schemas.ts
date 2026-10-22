import { z } from 'zod'
import { todayIso } from '@/domain/dates'
import { CATEGORY_LABELS, COLOR_LABELS } from '@/domain/labels'
import type { ItemCategory, ItemColor } from '@/domain/types'

const categories = Object.keys(CATEGORY_LABELS) as [ItemCategory, ...ItemCategory[]]
const colors = Object.keys(COLOR_LABELS) as [ItemColor, ...ItemColor[]]
const required = (message: string) => z.string().trim().min(1, message)

export const itemSchema = z.object({
  title: required('Bitte einen Titel angeben.').min(2, 'Mindestens 2 Zeichen.').max(120, 'Höchstens 120 Zeichen.'),
  category: z.enum(categories, { error: 'Bitte eine Kategorie wählen.' }),
  color: z.enum(colors, { error: 'Bitte eine Farbe wählen.' }),
  brand: z.string().trim().max(80),
  foundOn: required('Bitte das Funddatum angeben.').refine((v) => v <= todayIso(), 'Das Funddatum darf nicht in der Zukunft liegen.'),
  foundLocation: required('Bitte den Fundort angeben.'),
  publicDescription: z.string().trim().max(500, 'Höchstens 500 Zeichen.'),
  isPublic: z.boolean(),
  identifyingFeature: z.string().trim().max(500),
  internalNote: z.string().trim().max(1000),
  storageLocation: z.string().trim().max(200),
})
export type ItemForm = z.infer<typeof itemSchema>

export const officeSettingsSchema = z.object({
  name: required('Bitte eine Bezeichnung angeben.'),
  location: required('Bitte den Ort angeben.'),
  contactEmail: required('Bitte eine E-Mail-Adresse angeben.').email('Bitte eine gültige E-Mail-Adresse angeben.'),
  contactPhone: z.string().trim(),
  openingHours: required('Bitte Öffnungszeiten angeben.'),
  pickupNotes: z.string().trim(),
})
export type OfficeSettingsForm = z.infer<typeof officeSettingsSchema>
