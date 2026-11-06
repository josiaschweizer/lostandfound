import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { t } from '@/i18n/de-CH'
import { addDays, formatShortDate, startOfWeek, todayIso } from '@/domain/dates'
import { CATEGORIES, COLORS, isCategory, isColor, type ItemColor } from '@/domain/types'
import { queryKeys } from '@/lib/queryKeys'
import { saveLink } from '@/lib/savedLinks'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import type { ExtractedFields } from '@/services/ai'
import { toUserMessage } from '@/services/errors'
import { createLossReport, matchDraft } from '@/services/public'
import { AiFillBox } from '@/features/ai/AiFillBox'
import { ColorPicker } from '@/components/items/ColorDot'
import { ITEM_GRID, ItemCard } from '@/components/items/ItemCard'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { ErrorSummary, Field, Input, RequiredLegend, Select, Textarea } from '@/components/ui/Form'
import { Disclosure } from '@/components/ui/Disclosure'
import { Card, PageHeader } from '@/components/ui/Layout'
import { cn } from '@/components/ui/cn'
import { useOffices } from './queries'

const e = t.loss.errors
const schema = z
  .object({
    title: z.string().trim().min(2, e.what).max(120, e.what),
    category: z.enum(CATEGORIES, { error: e.category }),
    colors: z.array(z.enum(COLORS)).max(3),
    brand: z.string().trim().max(80, e.tooLong),
    description: z.string().trim().max(1000, e.tooLong),
    privateFeature: z.string().trim().max(500, e.tooLong),
    organisationId: z.string(),
    lostLocation: z.string().trim().max(200, e.tooLong),
    lostFrom: z.string(),
    lostTo: z.string(),
    lostDateUncertain: z.boolean(),
    email: z.string().trim().email(e.email).max(200, e.tooLong),
    name: z.string().trim().max(120, e.tooLong),
  })
  .refine((v) => v.lostDateUncertain || v.lostFrom !== '', { path: ['lostFrom'], message: e.date })
  .refine((v) => v.lostDateUncertain || v.lostTo <= todayIso(), { path: ['lostFrom'], message: e.future })

type FormValues = z.infer<typeof schema>
type FieldName = keyof FormValues

const STEPS: FieldName[][] = [
  ['title', 'category', 'colors', 'brand', 'description', 'privateFeature'],
  ['organisationId', 'lostLocation', 'lostFrom', 'lostTo', 'lostDateUncertain'],
  ['email', 'name'],
]

/** Felder der KI-Antwort → Formularfelder */
const AI_FIELDS: Partial<Record<keyof ExtractedFields, FieldName>> = {
  titel: 'title',
  kategorie: 'category',
  farben: 'colors',
  marke: 'brand',
  beschreibung: 'description',
  ort: 'lostLocation',
  datum_von: 'lostFrom',
}

const quickDates = () => {
  const today = todayIso()
  return [
    { key: 'today', label: t.loss.quick.today, from: today, to: today },
    { key: 'yesterday', label: t.loss.quick.yesterday, from: addDays(today, -1), to: addDays(today, -1) },
    { key: 'week', label: t.loss.quick.week, from: startOfWeek(today), to: today },
  ]
}

/** Verlust melden ohne Konto in drei Schritten (KONZEPT 5.3). */
export const LossReportPage = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const offices = useOffices()
  const [step, setStep] = useState(0)
  const [aiFilled, setAiFilled] = useState<{ filled: Set<FieldName>; uncertain: Set<FieldName> }>({ filled: new Set(), uncertain: new Set() })

  const presetCategory = params.get('kat')
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      title: params.get('titel')?.slice(0, 120) ?? '',
      category: (isCategory(presetCategory) ? presetCategory : '') as FormValues['category'],
      colors: (params.get('farbe') ?? '').split(',').filter(isColor).slice(0, 3),
      brand: '',
      description: '',
      privateFeature: '',
      organisationId: '',
      lostLocation: '',
      lostFrom: '',
      lostTo: '',
      lostDateUncertain: false,
      email: '',
      name: '',
    },
  })

  // Fundstelle aus ?stelle=<slug> übernehmen (Seite der Fundstelle, Suche)
  const presetSlug = params.get('stelle')
  useEffect(() => {
    const office = offices.data?.find((o) => o.slug === presetSlug || o.id === presetSlug)
    if (office && !form.getValues('organisationId')) form.setValue('organisationId', office.id)
  }, [offices.data, presetSlug, form])

  const values = useWatch({ control: form.control })
  const { errors, submitCount } = form.formState

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      createLossReport({
        ...v,
        organisationId: v.organisationId || null,
        lostFrom: v.lostDateUncertain ? null : v.lostFrom,
        lostTo: v.lostDateUncertain ? null : v.lostTo,
      }),
    onSuccess: (token, v) => {
      saveLink({ kind: 'loss', token, title: v.title, createdAt: new Date().toISOString() })
      navigate(`/verlust/${token}?neu=1`)
    },
  })

  // Treffer schon während des Ausfüllens (ab Schritt 2), ein einziger Treffer-Bereich
  const criteria = useDebouncedValue(
    {
      organisationId: values.organisationId || null,
      title: values.title ?? '',
      category: values.category,
      colors: (values.colors ?? []) as ItemColor[],
      brand: values.brand ?? '',
      description: values.description ?? '',
      lostLocation: values.lostLocation ?? '',
      lostFrom: values.lostDateUncertain ? null : values.lostFrom || null,
      lostTo: values.lostDateUncertain ? null : values.lostTo || null,
    },
    400,
  )
  const draftReady = step >= 1 && isCategory(criteria.category) && (values.lostDateUncertain || Boolean(criteria.lostFrom))
  const liveMatches = useQuery({
    queryKey: queryKeys.draftMatches(JSON.stringify(criteria)),
    queryFn: () => matchDraft({ ...criteria, category: criteria.category as FormValues['category'] }),
    enabled: draftReady,
    staleTime: 60_000,
  })

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
    if (fields.marke && !current.brand.trim()) set('brand', fields.marke)
    if (fields.beschreibung && !current.description.trim()) set('description', fields.beschreibung)
    if (fields.ort && !current.lostLocation.trim()) set('lostLocation', fields.ort)
    if (fields.datum_von && !current.lostFrom && !current.lostDateUncertain) {
      set('lostFrom', fields.datum_von)
      set('lostTo', fields.datum_bis ?? fields.datum_von)
    }
    const uncertain = new Set(fields.unsicher.map((key) => AI_FIELDS[key as keyof ExtractedFields]).filter((key): key is FieldName => Boolean(key)))
    setAiFilled({ filled, uncertain })
    return [...filled]
  }
  const aiState = (name: FieldName) => (aiFilled.uncertain.has(name) && aiFilled.filled.has(name) ? 'uncertain' : aiFilled.filled.has(name) ? 'filled' : undefined)

  const goTo = (next: number) => {
    setStep(next)
    window.scrollTo({ top: 0 })
  }
  const onNext = async () => {
    if (await form.trigger(STEPS[step])) goTo(step + 1)
  }
  const onSubmit = form.handleSubmit(
    (v) => mutation.mutate(v),
    (fieldErrors) => {
      const firstStep = STEPS.findIndex((fields) => fields.some((field) => field in fieldErrors))
      if (firstStep >= 0 && firstStep !== step) goTo(firstStep)
    },
  )

  const stepErrors = STEPS[step]!.filter((field) => errors[field]).map((field) => ({ field, message: errors[field]?.message ?? '' }))
  const isLast = step === STEPS.length - 1
  const quick = useMemo(() => quickDates(), [])
  const activeQuick = values.lostDateUncertain ? 'unknown' : quick.find((q) => q.from === values.lostFrom && q.to === values.lostTo)?.key
  const matches = draftReady ? (liveMatches.data ?? []) : []

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.loss.title} lead={t.loss.lead} />

      <div className="mb-5">
        <p className="mb-2 text-sm font-medium text-stone-700" aria-live="polite">
          {t.loss.stepOf(step + 1, STEPS.length)} · {t.loss.steps[step]}
        </p>
        <div className="grid grid-cols-3 gap-2" aria-hidden>
          {STEPS.map((_, index) => (
            <span key={index} className={cn('h-1.5 rounded-full', index <= step ? 'bg-brand-600' : 'bg-stone-200')} />
          ))}
        </div>
      </div>

      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          if (isLast) void onSubmit()
          else void onNext()
        }}
      >
        {submitCount > 0 && <ErrorSummary errors={stepErrors} />}

        {step === 0 && (
          <>
            <AiFillBox context="verlust" onFilled={fillFromAi} />
            <Card className="space-y-4 p-4 sm:p-6">
              <h2 className="text-lg font-semibold">{t.loss.steps[0]}</h2>
              <RequiredLegend />
              <div data-field="title">
                <Field label={t.loss.what} required error={errors.title?.message} aiState={aiState('title')}>
                  {(p) => <Input {...p} placeholder={t.loss.whatPlaceholder} {...form.register('title')} />}
                </Field>
              </div>
              <div data-field="category">
                <Field label={t.loss.category} required error={errors.category?.message} aiState={aiState('category')}>
                  {(p) => (
                    <Select
                      {...p}
                      placeholder={t.loss.chooseCategory}
                      options={CATEGORIES.map((value) => ({ value, label: t.labels.categories[value] }))}
                      {...form.register('category')}
                    />
                  )}
                </Field>
              </div>
              <div data-field="colors">
                <Field as="fieldset" label={`${t.loss.colors} (${t.common.optional})`} hint={t.loss.colorsHint} aiState={aiState('colors')}>
                  {() => <Controller control={form.control} name="colors" render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />} />}
                </Field>
              </div>
              <Field label={`${t.loss.brand} (${t.common.optional})`} error={errors.brand?.message} aiState={aiState('brand')}>
                {(p) => <Input {...p} {...form.register('brand')} />}
              </Field>
              <Field label={`${t.loss.description} (${t.common.optional})`} hint={t.loss.descriptionHint} error={errors.description?.message} aiState={aiState('description')}>
                {(p) => <Textarea {...p} rows={2} {...form.register('description')} />}
              </Field>
              <div className="rounded-2xl bg-accent-50 p-3 ring-1 ring-accent-100">
                <Field label={`${t.loss.privateFeature} (${t.common.optional})`} hint={t.loss.privateFeatureHint} error={errors.privateFeature?.message}>
                  {(p) => <Textarea {...p} rows={2} {...form.register('privateFeature')} />}
                </Field>
              </div>
            </Card>
          </>
        )}

        {step === 1 && (
          <Card className="space-y-4 p-4 sm:p-6">
            <h2 className="text-lg font-semibold">{t.loss.steps[1]}</h2>
            <Field label={t.loss.office} hint={t.loss.officeHint}>
              {(p) => (
                <Select
                  {...p}
                  placeholder={t.loss.officeUnknown}
                  options={(offices.data ?? []).map((office) => ({ value: office.id, label: office.name }))}
                  {...form.register('organisationId')}
                />
              )}
            </Field>
            <Field label={`${t.loss.place} (${t.common.optional})`} error={errors.lostLocation?.message} aiState={aiState('lostLocation')}>
              {(p) => <Input {...p} placeholder={t.loss.placePlaceholder} {...form.register('lostLocation')} />}
            </Field>
            <div data-field="lostFrom">
              <Field as="fieldset" label={t.loss.when} required error={errors.lostFrom?.message} aiState={aiState('lostFrom')}>
                {(p) => (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[...quick, { key: 'unknown', label: t.loss.quick.unknown, from: '', to: '' }].map((q) => (
                        <button
                          key={q.key}
                          type="button"
                          aria-pressed={activeQuick === q.key}
                          onClick={() => {
                            form.setValue('lostDateUncertain', q.key === 'unknown')
                            form.setValue('lostFrom', q.from)
                            form.setValue('lostTo', q.to, { shouldValidate: true })
                            void form.trigger('lostFrom')
                          }}
                          className={cn(
                            'min-h-11 rounded-full px-4 text-sm font-medium ring-1 transition',
                            activeQuick === q.key ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-800 ring-stone-300 hover:ring-stone-500',
                          )}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                    {values.lostDateUncertain ? (
                      <p className="text-sm text-stone-700">{t.loss.unknownHint}</p>
                    ) : (
                      <div className="max-w-56">
                        <label htmlFor={`${p.id}-date`} className="mb-1 block text-sm text-stone-700">
                          {t.loss.date}
                          {values.lostFrom && values.lostTo && values.lostFrom !== values.lostTo && ` (${formatShortDate(values.lostFrom)} – ${formatShortDate(values.lostTo)})`}
                        </label>
                        <Input
                          id={`${p.id}-date`}
                          type="date"
                          max={todayIso()}
                          value={values.lostTo ?? ''}
                          aria-invalid={p['aria-invalid']}
                          aria-describedby={p['aria-describedby']}
                          onChange={(event) => {
                            form.setValue('lostFrom', event.target.value)
                            form.setValue('lostTo', event.target.value, { shouldValidate: true })
                            void form.trigger('lostFrom')
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </Field>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="space-y-4 p-4 sm:p-6">
            <h2 className="text-lg font-semibold">{t.loss.steps[2]}</h2>
            <RequiredLegend />
            <div data-field="email">
              <Field label={t.loss.email} required hint={t.loss.emailHint} error={errors.email?.message}>
                {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
              </Field>
            </div>
            <Field label={`${t.loss.name} (${t.common.optional})`} error={errors.name?.message}>
              {(p) => <Input {...p} autoComplete="name" {...form.register('name')} />}
            </Field>
          </Card>
        )}

        {matches.length > 0 && (
          <Disclosure title={t.loss.liveMatches(matches.length)} summary={t.loss.liveMatchesHint} className="ring-brand-200" defaultOpen>
            <ul className={ITEM_GRID}>
              {matches.map((match) => (
                <li key={match.id}>
                  <ItemCard item={match} officeName={match.organisationName} reasons={match.reasons} target="_blank" />
                </li>
              ))}
            </ul>
          </Disclosure>
        )}

        {mutation.isError && <Alert tone="error">{toUserMessage(mutation.error)}</Alert>}

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => goTo(step - 1)}>
              {t.loss.back}
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" loading={mutation.isPending}>
            {isLast ? t.loss.submit : t.loss.next}
          </Button>
        </div>
      </form>
    </div>
  )
}
