import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, Lock, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { t } from '@/i18n/de-CH'
import { todayIso } from '@/domain/dates'
import { CATEGORIES, COLORS, type StaffItem } from '@/domain/types'
import { useStaff } from '@/app/auth'
import { photoSuggest, type ExtractedFields } from '@/services/ai'
import { useMutation } from '@tanstack/react-query'
import { AiStatusLine } from '@/features/ai/AiStatusLine'
import { useAiFeature } from '@/features/ai/useAiStatus'
import { toUserMessage } from '@/services/errors'
import { deletePhoto, photoUrl, uploadPhoto } from '@/services/photos'
import type { ItemInput } from '@/services/staff'
import { AiFillBox } from '@/features/ai/AiFillBox'
import { ColorPicker } from '@/components/items/ColorDot'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Checkbox, ErrorSummary, Field, Input, RequiredLegend, Select, Textarea } from '@/components/ui/Form'
import { Card } from '@/components/ui/Layout'
import { useStaffItems } from './queries'

const e = t.admin.itemForm.errors
const schema = z.object({
  title: z.string().trim().min(2, e.title).max(120, e.title),
  category: z.enum(CATEGORIES, { error: e.category }),
  colors: z.array(z.enum(COLORS)).min(1, e.colors).max(3),
  foundLocation: z.string().trim().min(1, e.foundLocation).max(200, e.tooLong),
  storageLocation: z.string().trim().min(1, e.storageLocation).max(200, e.tooLong),
  foundOn: z.string().min(1, e.foundOn).refine((v) => v <= todayIso(), e.foundOn),
  brand: z.string().trim().max(80, e.tooLong),
  publicDescription: z.string().trim().max(1000, e.tooLong),
  identifyingFeature: z.string().trim().max(500, e.tooLong),
  internalNote: z.string().trim().max(1000, e.tooLong),
  isPublic: z.boolean(),
})
type FormValues = z.infer<typeof schema>
type FieldName = keyof FormValues

const REQUIRED_ORDER: FieldName[] = ['title', 'category', 'colors', 'foundLocation', 'storageLocation', 'foundOn']

const toDefaults = (item?: StaffItem): FormValues => ({
  title: item?.title ?? '',
  category: (item?.category ?? '') as FormValues['category'],
  colors: item?.colors ?? [],
  foundLocation: item?.foundLocation ?? '',
  storageLocation: item?.storageLocation ?? '',
  foundOn: item?.foundOn ?? todayIso(),
  brand: item?.brand ?? '',
  publicDescription: item?.publicDescription ?? '',
  identifyingFeature: item?.identifyingFeature ?? '',
  internalNote: item?.internalNote ?? '',
  isPublic: item?.isPublic ?? true,
})

/** Zuletzt verwendete Orte als Vorschlag (KONZEPT 5.5). */
const useRecentPlaces = () => {
  const items = useStaffItems()
  return useMemo(() => {
    const unique = (values: string[]) => [...new Set(values.filter(Boolean))].slice(0, 12)
    const list = items.data ?? []
    return { found: unique(list.map((i) => i.foundLocation)), storage: unique(list.map((i) => i.storageLocation)) }
  }, [items.data])
}

/**
 * Kurzformular (KONZEPT 5.5): 6 Pflichtfelder sichtbar, Rest unter «Weitere Angaben»,
 * Speichern-Button immer sichtbar (auf Mobile unten fixiert), optional «In eigenen Worten».
 */
export const ItemForm = ({ item, onSubmit, onCancel }: { item?: StaffItem; onSubmit: (input: ItemInput) => Promise<void>; onCancel?: () => void }) => {
  const { organisation } = useStaff()
  const places = useRecentPlaces()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onTouched', defaultValues: toDefaults(item) })
  const { errors, isSubmitting, submitCount } = form.formState
  const [photoPath, setPhotoPath] = useState<string | null>(item?.photoPath ?? null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [aiFilled, setAiFilled] = useState<{ filled: Set<FieldName>; uncertain: Set<FieldName> }>({ filled: new Set(), uncertain: new Set() })
  const [moreOpen, setMoreOpen] = useState(Boolean(item))
  const fileInput = useRef<HTMLInputElement>(null)
  const [idCardNote, setIdCardNote] = useState(false)
  const photoAiEnabled = useAiFeature('photo_suggest')
  const [photoResult, setPhotoResult] = useState<'done' | 'nothing' | null>(null)

  const preview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])
  const previewUrl = preview ?? photoUrl(photoPath)

  const fillFromAi = (fields: ExtractedFields): string[] => {
    const filled = new Set<FieldName>()
    const current = form.getValues()
    const set = <K extends FieldName>(name: K, value: FormValues[K]) => {
      // react-hook-form kann den Werttyp eines generischen Feldnamens nicht ableiten
      form.setValue(name, value as never, { shouldDirty: true, shouldValidate: true })
      filled.add(name)
    }
    if (fields.titel && !current.title.trim()) set('title', fields.titel)
    if (fields.kategorie && !current.category) set('category', fields.kategorie)
    if (fields.farben.length > 0 && current.colors.length === 0) set('colors', fields.farben.slice(0, 3))
    if (fields.ort && !current.foundLocation.trim()) set('foundLocation', fields.ort)
    if (fields.datum_bis && fields.datum_bis !== current.foundOn && !form.formState.dirtyFields.foundOn) set('foundOn', fields.datum_bis)
    if (fields.marke && !current.brand.trim()) {
      set('brand', fields.marke)
      setMoreOpen(true)
    }
    if (fields.beschreibung && !current.publicDescription.trim()) {
      set('publicDescription', fields.beschreibung)
      setMoreOpen(true)
    }
    // Ausweise und Karten nie automatisch veröffentlichen (KONZEPT 7.5)
    if ((fields.kategorie === 'id_cards' || form.getValues('category') === 'id_cards') && current.isPublic && !form.formState.dirtyFields.isPublic) {
      form.setValue('isPublic', false, { shouldDirty: true })
      setMoreOpen(true)
      setIdCardNote(true)
    }
    const map: Record<string, FieldName> = { titel: 'title', kategorie: 'category', farben: 'colors', ort: 'foundLocation', marke: 'brand', beschreibung: 'publicDescription', datum_von: 'foundOn', datum_bis: 'foundOn' }
    const uncertain = fields.unsicher.map((key) => map[key]).filter((key): key is FieldName => Boolean(key))
    // Text- und Foto-Vorschläge ergänzen sich: bereits markierte Felder bleiben markiert
    setAiFilled((prev) => ({ filled: new Set([...prev.filled, ...filled]), uncertain: new Set([...prev.uncertain, ...uncertain.filter((key) => filled.has(key))]) }))
    return [...filled]
  }

  // Foto → Vorschlag (KONZEPT 7.5, C1): läuft automatisch, sobald ein Foto gewählt ist
  const photoAi = useMutation({
    mutationFn: photoSuggest,
    onMutate: () => setPhotoResult(null),
    onSuccess: (fields) => setPhotoResult(fillFromAi(fields).length > 0 ? 'done' : 'nothing'),
  })
  const choosePhoto = (file: File | null) => {
    setPhotoFile(file)
    if (file && photoAiEnabled) photoAi.mutate(file)
  }
  const photoStatus = photoAi.isPending
    ? t.ai.photoWorking
    : photoAi.isError
      ? t.ai.photoFailed
      : photoResult === 'done'
        ? t.ai.photoDone
        : photoResult === 'nothing'
          ? t.ai.photoNothing
          : null
  const aiState = (name: FieldName) => (aiFilled.filled.has(name) ? (aiFilled.uncertain.has(name) ? 'uncertain' : 'filled') : undefined)

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      const newPath = photoFile ? await uploadPhoto(organisation.id, photoFile) : photoPath
      await onSubmit({ ...values, photoPath: newPath })
      // Ersetztes oder entferntes Foto löschen
      if (item?.photoPath && item.photoPath !== newPath) void deletePhoto(item.photoPath)
    } catch (error) {
      setSubmitError(toUserMessage(error))
    }
  })

  const summary = REQUIRED_ORDER.concat(['brand', 'publicDescription', 'identifyingFeature', 'internalNote'])
    .filter((field) => errors[field])
    .map((field) => ({ field, message: errors[field]?.message ?? '' }))

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      {submitCount > 0 && <ErrorSummary errors={summary} />}
      <AiFillBox context="fund" onFilled={fillFromAi} />

      <Card className="space-y-4 p-4 sm:p-6">
        <RequiredLegend />
        <div>
          <p className="mb-1.5 font-medium text-stone-800">
            {t.admin.itemForm.photo} <span className="text-sm font-normal text-stone-600">({t.common.optional})</span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {previewUrl && <img src={previewUrl} alt="" className="size-20 rounded-xl object-cover ring-1 ring-stone-200" />}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              id="item-photo"
              onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
            />
            <Button variant="secondary" icon={<Camera className="size-5" aria-hidden />} onClick={() => fileInput.current?.click()}>
              {t.admin.itemForm.photoButton}
            </Button>
            {previewUrl && (
              <Button
                variant="ghost"
                icon={<Trash2 className="size-4" aria-hidden />}
                onClick={() => {
                  setPhotoFile(null)
                  setPhotoPath(null)
                  if (fileInput.current) fileInput.current.value = ''
                }}
              >
                {t.admin.itemForm.photoRemove}
              </Button>
            )}
          </div>
          <p className="mt-1 text-sm text-stone-600">
            {photoAiEnabled && `${t.ai.photoHint} `}
            {t.admin.itemForm.photoHint}
          </p>
          <AiStatusLine className="mt-1" running={photoAi.isPending} text={photoStatus} />
          {idCardNote && <AiStatusLine running={false} text={t.ai.idCardPrivate} />}
        </div>

        <div data-field="title">
          <Field label={t.admin.itemForm.title} required error={errors.title?.message} aiState={aiState('title')}>
            {(p) => <Input {...p} placeholder={t.admin.itemForm.titlePlaceholder} {...form.register('title')} />}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div data-field="category">
            <Field label={t.admin.itemForm.category} required error={errors.category?.message} aiState={aiState('category')}>
              {(p) => <Select {...p} placeholder={t.loss.chooseCategory} options={CATEGORIES.map((value) => ({ value, label: t.labels.categories[value] }))} {...form.register('category')} />}
            </Field>
          </div>
          <div data-field="foundOn">
            <Field label={t.admin.itemForm.foundOn} required error={errors.foundOn?.message} aiState={aiState('foundOn')}>
              {(p) => <Input {...p} type="date" max={todayIso()} {...form.register('foundOn')} />}
            </Field>
          </div>
        </div>
        <div data-field="colors">
          <Field as="fieldset" label={t.admin.itemForm.colors} required error={errors.colors?.message} aiState={aiState('colors')}>
            {() => (
              <Controller
                control={form.control}
                name="colors"
                render={({ field }) => (
                  <ColorPicker
                    value={field.value}
                    onChange={(colors) => {
                      field.onChange(colors)
                      field.onBlur()
                    }}
                  />
                )}
              />
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div data-field="foundLocation">
            <Field label={t.admin.itemForm.foundLocation} required error={errors.foundLocation?.message} aiState={aiState('foundLocation')}>
              {(p) => <Input {...p} list="recent-found" placeholder={t.admin.itemForm.foundLocationPlaceholder} {...form.register('foundLocation')} />}
            </Field>
          </div>
          <div data-field="storageLocation" className="rounded-2xl bg-accent-50 p-2 ring-1 ring-accent-100">
            <Field label={t.admin.itemForm.storageLocation} required error={errors.storageLocation?.message}>
              {(p) => <Input {...p} list="recent-storage" placeholder={t.admin.itemForm.storageLocationPlaceholder} {...form.register('storageLocation')} />}
            </Field>
          </div>
        </div>
        <datalist id="recent-found">
          {places.found.map((place) => (
            <option key={place} value={place} />
          ))}
        </datalist>
        <datalist id="recent-storage">
          {places.storage.map((place) => (
            <option key={place} value={place} />
          ))}
        </datalist>
      </Card>

      <details className="group rounded-3xl bg-white shadow-xs ring-1 ring-stone-200/80" open={moreOpen} onToggle={(event) => setMoreOpen(event.currentTarget.open)}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold sm:px-6 [&::-webkit-details-marker]:hidden">
          {t.common.more}
          <span className="text-sm font-normal text-stone-600">{t.common.optional}</span>
        </summary>
        <div className="space-y-4 px-4 pb-5 sm:px-6">
          <Field label={t.admin.itemForm.brand} error={errors.brand?.message} aiState={aiState('brand')}>
            {(p) => <Input {...p} {...form.register('brand')} />}
          </Field>
          <Field label={t.admin.itemForm.publicDescription} hint={t.admin.itemForm.publicDescriptionHint} error={errors.publicDescription?.message} aiState={aiState('publicDescription')}>
            {(p) => <Textarea {...p} rows={2} {...form.register('publicDescription')} />}
          </Field>
          <div className="space-y-4 rounded-2xl bg-accent-50 p-3 ring-1 ring-accent-100">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-700">
              <Lock className="size-4" aria-hidden /> {t.admin.itemForm.internalBadge}
            </p>
            <Field label={t.admin.itemForm.identifyingFeature} hint={t.admin.itemForm.identifyingFeatureHint} error={errors.identifyingFeature?.message}>
              {(p) => <Textarea {...p} rows={2} {...form.register('identifyingFeature')} />}
            </Field>
            <Field label={t.admin.itemForm.internalNote} error={errors.internalNote?.message}>
              {(p) => <Input {...p} {...form.register('internalNote')} />}
            </Field>
          </div>
          <Checkbox label={t.admin.itemForm.isPublic} description={t.admin.itemForm.isPublicHint} {...form.register('isPublic')} />
        </div>
      </details>

      {submitError && <Alert tone="error">{submitError}</Alert>}

      {/* Speichern immer sichtbar: auf Mobile über der unteren Leiste fixiert (T4) */}
      <div
        data-sticky-bar
        className="fixed inset-x-0 bottom-(--bottom-nav) z-30 flex gap-2 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
      >
        {onCancel && (
          <Button variant="secondary" size="lg" onClick={onCancel}>
            {t.common.cancel}
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1 lg:flex-none" loading={isSubmitting}>
          {isSubmitting ? t.admin.itemForm.saving : t.admin.itemForm.save}
        </Button>
      </div>
    </form>
  )
}
