import { z } from 'zod'
import { ORGANISATION_TYPE_LABELS } from '@/domain/labels'
import type { OrganisationType } from '@/domain/types'

const required = (message: string) => z.string().trim().min(1, message)
const email = required('Bitte eine E-Mail-Adresse angeben.').email('Bitte eine gültige E-Mail-Adresse angeben.')

export const loginSchema = z.object({
  email,
  password: required('Bitte das Passwort angeben.'),
})
export type LoginForm = z.infer<typeof loginSchema>

export const accountSchema = z
  .object({
    fullName: required('Bitte Ihren Namen angeben.'),
    email,
    password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein.'),
    passwordRepeat: z.string(),
  })
  .refine((v) => v.password === v.passwordRepeat, { path: ['passwordRepeat'], message: 'Die Passwörter stimmen nicht überein.' })
export type AccountForm = z.infer<typeof accountSchema>

const types = Object.keys(ORGANISATION_TYPE_LABELS) as [OrganisationType, ...OrganisationType[]]

const organisationSchema = z.object({
  organisationName: required('Bitte den Namen der Organisation angeben.').min(2, 'Mindestens 2 Zeichen.').max(120),
  organisationType: z.enum(types, { error: 'Bitte die Art der Organisation wählen.' }),
  address: required('Bitte Adresse bzw. Standort angeben.'),
})

const officeSchema = z.object({
  officeName: z.string().trim().max(120),
  officeLocation: required('Bitte angeben, wo sich die Fundstelle befindet.'),
  contactEmail: email,
  contactPhone: z.string().trim().max(40),
  openingHours: required('Bitte Öffnungszeiten oder Abholzeiten angeben.'),
  pickupNotes: z.string().trim().max(500),
})

/** Organisation und Fundstelle in einem Schritt (Version 1: genau eine Fundstelle pro Organisation). */
export const setupSchema = organisationSchema.extend(officeSchema.shape)
export type SetupForm = z.infer<typeof setupSchema>
