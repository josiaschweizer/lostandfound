import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, ImagePlus, Lock, Trash2 } from 'lucide-react'
import { todayIso } from '@/domain/dates'
import { CATEGORY_LABELS, COLOR_LABELS, toOptions } from '@/domain/labels'
import type { StaffItem } from '@/domain/types'
import { useStaffContext } from '@/app/useAuth'
import { toUserMessage } from '@/services/errors'
import { photoUrl, uploadPhoto } from '@/services/photos'
import type { ItemInput } from '@/services/staffItems'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Checkbox, Field, Input, RequiredNote, Select, Textarea } from '@/components/ui/Form'
import { CardSection } from '@/components/ui/Layout'
import { itemSchema, type ItemForm as FormValues } from './schemas'

interface ItemFormProps {
  item?: StaffItem
  submitLabel: string
  onSubmit: (input: ItemInput) => Promise<unknown>
  onCancel: () => void
}

const toDefaults = (item?: StaffItem): FormValues => ({
  title: item?.title ?? '',
  category: item?.category ?? ('' as FormValues['category']),
  color: item?.color ?? ('' as FormValues['color']),
  brand: item?.brand ?? '',
  foundOn: item?.foundOn ?? todayIso(),
  foundLocation: item?.foundLocation ?? '',
  publicDescription: item?.publicDescription ?? '',
  isPublic: item?.isPublic ?? true,
  identifyingFeature: item?.internal.identifyingFeature ?? '',
  internalNote: item?.internal.internalNote ?? '',
  storageLocation: item?.internal.storageLocation ?? '',
})

/** Formular zum Erfassen und Bearbeiten. Öffentliche und interne Angaben sind klar getrennt. */
export const ItemForm = ({ item, submitLabel, onSubmit, onCancel }: ItemFormProps) => {
  const { organisation } = useStaffContext()
  const [photoPath, setPhotoPath] = useState<string | null>(item?.photoPath ?? null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const form = useForm<FormValues>({ resolver: zodResolver(itemSchema), defaultValues: toDefaults(item) })
  const { errors, isSubmitting } = form.formState

  const localPreview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile])
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview) }, [localPreview])
  const previewUrl = localPreview ?? photoUrl(photoPath)

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      const finalPhotoPath = photoFile ? await uploadPhoto(organisation.id, photoFile) : photoPath
      await onSubmit({
        title: values.title,
        category: values.category,
        color: values.color,
        brand: values.brand,
        foundOn: values.foundOn,
        foundLocation: values.foundLocation,
        publicDescription: values.publicDescription,
        isPublic: values.isPublic,
        photoPath: finalPhotoPath,
        internal: {
          identifyingFeature: values.identifyingFeature,
          internalNote: values.internalNote,
          storageLocation: values.storageLocation,
        },
      })
    } catch (error) {
      setSubmitError(toUserMessage(error))
    }
  })

  return (
    <form noValidate onSubmit={submit} className="space-y-6">
      <RequiredNote />
      <CardSection
        title="Öffentliche Angaben"
        description="Diese Angaben sehen Suchende im Fundkatalog. Keine Merkmale angeben, die einen Eigentumsnachweis verraten."
        actions={
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <Eye className="size-4" aria-hidden /> Öffentlich
          </span>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-stone-800">
              Foto <span className="ml-1 text-xs font-normal text-stone-500">(optional)</span>
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200">
                {previewUrl ? <img src={previewUrl} alt="Vorschau" className="size-full object-cover" /> : <ImagePlus className="size-6 text-stone-400" aria-hidden />}
              </div>
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium ring-1 ring-stone-300 hover:bg-stone-50">
                  <ImagePlus className="size-4" aria-hidden /> Foto wählen
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {(photoFile || photoPath) && (
                  <Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => { setPhotoFile(null); setPhotoPath(null) }}>
                    Foto entfernen
                  </Button>
                )}
                <p className="text-xs text-stone-500">Tipp: Gravuren, Namen oder Inhalte nicht fotografieren.</p>
              </div>
            </div>
          </div>
          <Field label="Titel" required className="sm:col-span-2" error={errors.title?.message} hint="Kurz und allgemein, z. B. «Kabellose Kopfhörer»">
            {(p) => <Input {...p} {...form.register('title')} />}
          </Field>
          <Field label="Kategorie" required error={errors.category?.message}>
            {(p) => <Select {...p} {...form.register('category')} placeholder="Bitte wählen" options={toOptions(CATEGORY_LABELS)} />}
          </Field>
          <Field label="Farbe" required error={errors.color?.message}>
            {(p) => <Select {...p} {...form.register('color')} placeholder="Bitte wählen" options={toOptions(COLOR_LABELS)} />}
          </Field>
          <Field label="Marke" error={errors.brand?.message} hint="Falls bekannt">
            {(p) => <Input {...p} {...form.register('brand')} />}
          </Field>
          <Field label="Funddatum" required error={errors.foundOn?.message}>
            {(p) => <Input type="date" max={todayIso()} {...p} {...form.register('foundOn')} />}
          </Field>
          <Field label="Fundort" required className="sm:col-span-2" error={errors.foundLocation?.message} hint="z. B. Mensa, Bus Linie 3">
            {(p) => <Input {...p} {...form.register('foundLocation')} />}
          </Field>
          <Field label="Öffentliche Beschreibung" className="sm:col-span-2" error={errors.publicDescription?.message}>
            {(p) => <Textarea {...p} {...form.register('publicDescription')} />}
          </Field>
          <div className="sm:col-span-2">
            <Checkbox label="Im öffentlichen Fundkatalog anzeigen" description="Deaktivieren z. B. bei Ausweisen oder sensiblen Gegenständen." {...form.register('isPublic')} />
          </div>
        </div>
      </CardSection>

      <CardSection
        title="Interne Angaben"
        description="Nur für Mitarbeitende Ihrer Organisation sichtbar – nie im Katalog."
        className="ring-accent-600/30"
        actions={
          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-700">
            <Lock className="size-4" aria-hidden /> Intern
          </span>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Internes Erkennungsmerkmal"
            className="sm:col-span-2"
            error={errors.identifyingFeature?.message}
            hint="Zum Vergleichen mit dem Eigentumsnachweis einer Anfrage, z. B. Gravur, Aufkleber, Inhalt."
          >
            {(p) => <Textarea rows={2} {...p} {...form.register('identifyingFeature')} />}
          </Field>
          <Field label="Interner Aufbewahrungsort" error={errors.storageLocation?.message} hint="z. B. Schrank A, Fach 2">
            {(p) => <Input {...p} {...form.register('storageLocation')} />}
          </Field>
          <Field label="Interne Notiz" error={errors.internalNote?.message}>
            {(p) => <Input {...p} {...form.register('internalNote')} />}
          </Field>
        </div>
      </CardSection>

      {Object.keys(errors).length > 0 && <Alert tone="error">Bitte die markierten Felder prüfen.</Alert>}
      {submitError && <Alert tone="error">{submitError}</Alert>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
