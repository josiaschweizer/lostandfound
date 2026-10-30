import { useMemo, useState, type FormEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ExternalLink } from 'lucide-react'
import { formatDate, todayIso } from '@/domain/dates'
import { findMatches } from '@/domain/matching'
import { CATEGORY_LABELS, COLOR_LABELS, toOptions } from '@/domain/labels'
import { saveLink } from '@/lib/localTokens'
import { parseLossReport } from '@/services/ai'
import { toUserMessage } from '@/services/errors'
import { AiButton, AiNote } from '@/components/ai/AiButton'
import { submitLossReport } from '@/services/lossReports'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Field, Input, RequiredNote, Select, Textarea } from '@/components/ui/Form'
import { CardSection, PageHeader } from '@/components/ui/Layout'
import { ActionBar } from '@/components/ui/ActionBar'
import { Disclosure } from '@/components/ui/Disclosure'
import { Stepper } from '@/components/ui/Stepper'
import { ColorDot, ItemImage } from '@/components/items/ItemVisual'
import { cn } from '@/components/ui/cn'
import { ContactHint } from './ContactHint'
import { useCatalog, useOrganisationLookup, useOrganisations } from './queries'
import { lossReportSchema, type LossReportForm } from './schemas'

const isCategory = (v: string | null): v is LossReportForm['category'] => Boolean(v && v in CATEGORY_LABELS)
const isColor = (v: string | null): v is LossReportForm['color'] => Boolean(v && v in COLOR_LABELS)

const daysAgo = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return todayIso(d)
}

const STEPS = [
  { label: 'Gegenstand', fields: ['title', 'category', 'color', 'brand', 'description'] },
  { label: 'Ort & Datum', fields: ['organisationId', 'lostOn', 'lostLocation'] },
  { label: 'Kontakt', fields: ['name', 'contact'] },
] as const satisfies { label: string; fields: (keyof LossReportForm)[] }[]

const DATE_SHORTCUTS = [
  { label: 'Heute', days: 0 },
  { label: 'Gestern', days: 1 },
  { label: 'Vorgestern', days: 2 },
  { label: 'Vor einer Woche', days: 7 },
]

export const LossReportPage = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const organisations = useOrganisations()
  const form = useForm<LossReportForm>({
    resolver: zodResolver(lossReportSchema),
    defaultValues: {
      // Angaben aus der Suche übernehmen (siehe lossReportUrl)
      organisationId: params.get('org') ?? '',
      name: '',
      contact: '',
      title: params.get('titel')?.slice(0, 120) ?? '',
      category: (isCategory(params.get('kategorie')) ? params.get('kategorie') : '') as LossReportForm['category'],
      color: (isColor(params.get('farbe')) ? params.get('farbe') : '') as LossReportForm['color'],
      brand: '',
      lostOn: (params.get('datum') ?? '') <= todayIso() ? (params.get('datum') ?? '') : '',
      lostLocation: '',
      description: '',
    },
  })
  const mutation = useMutation({
    mutationFn: (values: LossReportForm) => submitLossReport({ ...values, organisationId: values.organisationId || null }),
    onSuccess: (token, values) => {
      saveLink({ kind: 'report', token, title: values.title, createdAt: new Date().toISOString() })
      navigate(`/status/meldung/${token}?neu=1`)
    },
  })
  const { errors } = form.formState
  const [freeText, setFreeText] = useState('')

  const catalog = useCatalog()
  const lookup = useOrganisationLookup()
  const [organisationId, title, category, color, brand, lostOn, description, contact] = useWatch({
    control: form.control,
    name: [
    'organisationId',
    'title',
    'category',
    'color',
    'brand',
    'lostOn',
    'description',
    'contact',
    ],
  })
  const liveMatches = useMemo(() => {
    if (!category || !lostOn || lostOn > todayIso() || !catalog.data) return []
    return findMatches({ organisationId: organisationId || null, title, category, color, brand, lostOn, description }, catalog.data).slice(0, 3)
  }, [catalog.data, organisationId, title, category, color, brand, lostOn, description])
  const ai = useMutation({
    mutationFn: parseLossReport,
    onSuccess: (draft) => {
      const fields = ['title', 'category', 'color', 'brand', 'lostOn', 'lostLocation', 'description'] as const
      for (const key of fields) {
        const value = draft[key]
        if (value) form.setValue(key, value, { shouldDirty: true, shouldValidate: true })
      }
    },
  })

  const [step, setStep] = useState(0)
  const isLastStep = step === STEPS.length - 1
  const goToStep = (next: number) => {
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isLastStep) {
      if (await form.trigger([...(STEPS[step]?.fields ?? [])])) goToStep(step + 1)
      return
    }
    await form.handleSubmit(
      (values) => mutation.mutate(values),
      // Fehler in einem früheren Schritt (z. B. aus der Suche übernommen): dorthin springen
      (fieldErrors) => {
        const firstInvalid = STEPS.findIndex((s) => s.fields.some((field) => field in fieldErrors))
        if (firstInvalid >= 0) goToStep(firstInvalid)
      },
    )()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Verlust melden" description="In drei kurzen Schritten. Passende Funde zeigen wir Ihnen sofort." />
      <Stepper steps={STEPS.map((s) => s.label)} current={step} />

      <form noValidate onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
        {step === 0 && (
          <>
            <Disclosure title="In eigenen Worten beschreiben" summary="Die KI füllt das Formular aus" className="ring-brand-100">
              <div className="space-y-3">
                <Textarea
                  aria-label="Beschreibung in eigenen Worten"
                  rows={3}
                  maxLength={2000}
                  placeholder="z. B. Ich habe letzten Dienstag im Bus Linie 3 meine blaue Nike-Regenjacke liegen lassen."
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <AiButton onClick={() => ai.mutate(freeText)} loading={ai.isPending} disabled={freeText.trim().length < 10}>
                    Formular ausfüllen
                  </AiButton>
                  {ai.isSuccess && <AiNote>Felder ausgefüllt – bitte prüfen.</AiNote>}
                  {ai.isError && <p className="text-xs font-medium text-red-700">{toUserMessage(ai.error)}</p>}
                </div>
                <p className="text-xs text-stone-500">Der Text geht an einen KI-Dienst. Bitte keine Namen oder Kontaktdaten eingeben.</p>
              </div>
            </Disclosure>

            <CardSection title="Was haben Sie verloren?">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Bezeichnung" required className="col-span-2" error={errors.title?.message}>
                  {(p) => <Input placeholder="z. B. Schwarzer Rucksack" {...p} {...form.register('title')} />}
                </Field>
                <Field label="Kategorie" required error={errors.category?.message}>
                  {(p) => <Select {...p} {...form.register('category')} placeholder="Bitte wählen" options={toOptions(CATEGORY_LABELS)} />}
                </Field>
                <Field label="Farbe" required error={errors.color?.message}>
                  {(p) => <Select {...p} {...form.register('color')} placeholder="Bitte wählen" options={toOptions(COLOR_LABELS)} />}
                </Field>
                <Field label="Marke" className="col-span-2 sm:col-span-1" error={errors.brand?.message}>
                  {(p) => <Input {...p} {...form.register('brand')} />}
                </Field>
                <Field
                  label="Beschreibung"
                  className="col-span-2"
                  hint="Ganz persönliche Merkmale erst bei einer Rückgabeanfrage angeben."
                  error={errors.description?.message}
                >
                  {(p) => <Textarea {...p} {...form.register('description')} />}
                </Field>
              </div>
            </CardSection>
          </>
        )}

        {step === 1 && (
          <CardSection title="Wo und wann?">
            <div className="space-y-4">
              <Field label="Fundstelle" required hint="«Weiss nicht»: Alle Fundstellen sehen Ihre Meldung." error={errors.organisationId?.message}>
                {(p) => (
                  <Select
                    {...p}
                    {...form.register('organisationId')}
                    placeholder="Weiss nicht – bei allen melden"
                    options={(organisations.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
                  />
                )}
              </Field>
              <Field label="Verloren am" required error={errors.lostOn?.message} hint="Unsicher? Den frühesten möglichen Tag wählen.">
                {(p) => (
                  <div className="space-y-2">
                    <Input type="date" max={todayIso()} {...p} {...form.register('lostOn')} />
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Datum schnell wählen">
                      {DATE_SHORTCUTS.map(({ label, days }) => {
                        const value = daysAgo(days)
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => form.setValue('lostOn', value, { shouldDirty: true, shouldValidate: true })}
                            className={cn(
                              'rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition',
                              lostOn === value ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-700 ring-stone-200 hover:ring-stone-400',
                            )}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </Field>
              <Field label="Ort des Verlusts" error={errors.lostLocation?.message}>
                {(p) => <Input placeholder="z. B. Bus Linie 3, Mensa" {...p} {...form.register('lostLocation')} />}
              </Field>
            </div>
          </CardSection>
        )}

        {step === 2 && (
          <CardSection title="Wie erreichen wir Sie?">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" required error={errors.name?.message}>
                {(p) => <Input autoComplete="name" {...p} {...form.register('name')} />}
              </Field>
              <Field label="Kontaktadresse" required hint={<ContactHint value={contact} />} error={errors.contact?.message}>
                {(p) => <Input autoComplete="email" {...p} {...form.register('contact')} />}
              </Field>
            </div>
          </CardSection>
        )}

        {liveMatches.length > 0 && (
          <CardSection
            title="Ist es vielleicht einer davon?"
            description="Passt zu Ihren Angaben. Öffnet in neuem Tab – Ihre Eingaben bleiben erhalten."
            className="ring-brand-200"
          >
            <ul className="space-y-2">
              {liveMatches.map(({ item }) => (
                <li key={item.id}>
                  <Link
                    to={`/fund/${item.id}`}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-3 rounded-xl bg-stone-50 p-2 ring-1 ring-stone-200 transition hover:ring-brand-300"
                  >
                    <ItemImage photoPath={item.photoPath} category={item.category} title={item.title} className="size-12 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-medium">{item.title}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
                        <ColorDot color={item.color} /> {formatDate(item.foundOn)} · {lookup.get(item.organisationId)?.name}
                      </span>
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-stone-400" aria-label="öffnet in neuem Tab" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardSection>
        )}

        {mutation.isError && <Alert tone="error">{toUserMessage(mutation.error)}</Alert>}
        <RequiredNote />
        <ActionBar className="lg:justify-end">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => goToStep(step - 1)} className="max-w-32">
              Zurück
            </Button>
          )}
          <Button type="submit" size="lg" loading={mutation.isPending}>
            {isLastStep ? 'Verlust melden' : 'Weiter'}
          </Button>
        </ActionBar>
      </form>
    </div>
  )
}
