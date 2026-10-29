import { z } from 'zod'
import { todayIso } from '@/domain/dates'
import { CATEGORY_LABELS, COLOR_LABELS } from '@/domain/labels'
import type { ItemCategory, ItemColor } from '@/domain/types'

const required = (message: string) => z.string().trim().min(1, message)

const contactSchema = required('Bitte eine Kontaktadresse angeben.').refine(
  (v) => /^\S+@\S+\.\S+$/.test(v) || /^[+\d][\d\s/-]{6,}$/.test(v),
  'Bitte eine gültige E-Mail-Adresse oder Telefonnummer angeben.',
)

export const returnRequestSchema = z.object({
  name: required('Bitte Ihren Namen angeben.'),
  contact: contactSchema,
  message: z.string().trim().max(1000, 'Höchstens 1000 Zeichen.'),
  proof: z
    .string()
    .trim()
    .min(10, 'Bitte ein besonderes Merkmal genauer beschreiben (mindestens 10 Zeichen).')
    .max(1000, 'Höchstens 1000 Zeichen.'),
})
export type ReturnRequestForm = z.infer<typeof returnRequestSchema>

const categories = Object.keys(CATEGORY_LABELS) as [ItemCategory, ...ItemCategory[]]
const colors = Object.keys(COLOR_LABELS) as [ItemColor, ...ItemColor[]]

export const lossReportSchema = z.object({
  organisationId: z.string(),
  name: required('Bitte Ihren Namen angeben.'),
  contact: contactSchema,
  title: required('Bitte angeben, was Sie verloren haben.').max(120, 'Höchstens 120 Zeichen.'),
  category: z.enum(categories, { error: 'Bitte eine Kategorie wählen.' }),
  color: z.enum(colors, { error: 'Bitte eine Farbe wählen.' }),
  brand: z.string().trim().max(80),
  lostOn: required('Bitte das Verlustdatum angeben.').refine((v) => v <= todayIso(), 'Das Datum darf nicht in der Zukunft liegen.'),
  lostLocation: z.string().trim().max(200),
  description: z.string().trim().max(1000, 'Höchstens 1000 Zeichen.'),
})
export type LossReportForm = z.infer<typeof lossReportSchema>
