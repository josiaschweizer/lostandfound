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
import { imageToDataUrl } from '@/lib/image'
import { analyzePhoto, suggestItemDescription } from '@/services/ai'
import { AiButton, AiNote } from '@/components/ai/AiButton'
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

export const ItemForm = ({ item, submitLabel, onSubmit, onCancel }: ItemFormProps) => {
  const { organisation } = useStaffContext()
  const [photoPath, setPhotoPath] = useState<string | null>(item?.photoPath ?? null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [aiState, setAiState] = useState<{ loading: boolean; error: string | null; suggested: boolean }>({ loading: false, error: null, suggested: false })
  const [photoAi, setPhotoAi] = useState<{ loading: boolean; error: string | null; filled: string[] | null; warnings: string[] }>({
    loading: false,
    error: null,
    filled: null,
    warnings: [],
  })
  const form = useForm<FormValues>({ resolver: zodResolver(itemSchema), defaultValues: toDefaults(item) })
  const { errors, isSubmitting } = form.formState

  const localPreview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile])
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview) }, [localPreview])
  const previewUrl = localPreview ?? photoUrl(photoPath)

  const recognisePhoto = async () => {
    setPhotoAi({ loading: true, error: null, filled: null, warnings: [] })
    try {
      const source = photoFile ?? (previewUrl ? await (await fetch(previewUrl)).blob() : null)
      if (!source) throw new Error('Bitte zuerst ein Foto wählen.')
      const analysis = await analyzePhoto(await imageToDataUrl(source))
      const current = form.getValues()
      const filled: string[] = []
      const options = { shouldDirty: true, shouldValidate: true }
      if (analysis.title && !current.title) {
        form.setValue('title', analysis.title, options)
        filled.push('Titel')
      }
      if (analysis.category && !current.category) {
        form.setValue('category', analysis.category, options)
        filled.push('Kategorie')
      }
      if (analysis.color && !current.color) {
        form.setValue('color', analysis.color, options)
        filled.push('Farbe')
      }
      if (analysis.brand && !current.brand) {
        form.setValue('brand', analysis.brand, options)
        filled.push('Marke')
      }
      if (analysis.description && !current.publicDescription) {
        form.setValue('publicDescription', analysis.description, options)
        filled.push('Beschreibung')
      }
      setPhotoAi({ loading: false, error: null, filled, warnings: analysis.warnings })
    } catch (error) {
      setPhotoAi({ loading: false, error: toUserMessage(error), filled: null, warnings: [] })
    }
  }

  /** Schickt nur öffentliche Angaben an die KI – interne Merkmale bleiben im Browser. */
  const suggestDescription = async () => {
    const v = form.getValues()
    if (!v.title.trim()) {
      setAiState({ loading: false, error: 'Bitte zuerst einen Titel eingeben.', suggested: false })
      return
    }
    setAiState({ loading: true, error: null, suggested: false })
    try {
      const text = await suggestItemDescription({
        title: v.title,
        category: v.category,
        color: v.color,
        brand: v.brand,
        foundLocation: v.foundLocation,
        notes: v.publicDescription,
      })
      form.setValue('publicDescription', text, { shouldDirty: true, shouldValidate: true })
      setAiState({ loading: false, error: null, suggested: true })
    } catch (error) {
      setAiState({ loading: false, error: toUserMessage(error), suggested: false })
    }
  }

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
                    onChange={(e) => {
                      setPhotoFile(e.target.files?.[0] ?? null)
                      setPhotoAi({ loading: false, error: null, filled: null, warnings: [] })
                    }}
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
            {previewUrl && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <AiButton onClick={recognisePhoto} loading={photoAi.loading}>
                    Angaben aus Foto erkennen
                  </AiButton>
                  {photoAi.filled && (
                    <AiNote>
                      {photoAi.filled.length > 0
                        ? `Ausgefüllt: ${photoAi.filled.join(', ')} – bitte prüfen.`
                        : 'Alle erkannten Felder waren bereits ausgefüllt – nichts überschrieben.'}
                    </AiNote>
                  )}
                  {photoAi.error && <p className="text-xs font-medium text-red-700">{photoAi.error}</p>}
                </div>
                {photoAi.warnings.length > 0 && (
                  <Alert tone="warning" title="Auf dem Foto sind evtl. persönliche Angaben sichtbar">
                    <ul className="list-disc pl-4">
                      {photoAi.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                    <p className="mt-1">Bitte ein anderes Foto wählen oder den Gegenstand nicht öffentlich anzeigen.</p>
                  </Alert>
                )}
              </div>
            )}
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
          <div className="space-y-2 sm:col-span-2">
            <Field
              label="Öffentliche Beschreibung"
              error={errors.publicDescription?.message}
              hint="Tipp: Stichworte eingeben und von der KI ausformulieren lassen."
            >
              {(p) => <Textarea {...p} {...form.register('publicDescription')} />}
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <AiButton onClick={suggestDescription} loading={aiState.loading}>
                Beschreibung vorschlagen
              </AiButton>
              {aiState.suggested && <AiNote />}
              {aiState.error && <p className="text-xs font-medium text-red-700">{aiState.error}</p>}
            </div>
          </div>
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
