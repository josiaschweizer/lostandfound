import { useMemo, useState } from 'react'
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

  // Schon beim Ausfüllen zeigen, ob der Gegenstand vielleicht bereits abgegeben wurde.
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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Verlust melden"
        description="Beschreiben Sie den Gegenstand. Wir zeigen Ihnen sofort mögliche Treffer und informieren Sie, wenn ein passender Fund erfasst wird."
      />
      <form noValidate onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
        <CardSection
          title="In eigenen Worten beschreiben"
          description="Optional: Erzählen Sie kurz, was passiert ist – die KI füllt das Formular unten für Sie aus."
        >
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
              {ai.isSuccess && <AiNote>Felder wurden ausgefüllt – bitte unten prüfen und ergänzen.</AiNote>}
              {ai.isError && <p className="text-xs font-medium text-red-700">{toUserMessage(ai.error)}</p>}
            </div>
            <p className="text-xs text-stone-500">Ihr Text wird zur Auswertung an einen KI-Dienst gesendet. Bitte keine Namen oder Kontaktdaten eingeben.</p>
          </div>
        </CardSection>

        <CardSection title="Wo haben Sie den Gegenstand verloren?">
          <Field
            label="Fundstelle"
            required
            hint={'Wählen Sie «Weiss nicht», wenn Sie es nicht wissen – dann sehen alle Fundstellen Ihre Meldung.'}
            error={errors.organisationId?.message}
          >
            {(p) => (
              <Select
                {...p}
                {...form.register('organisationId')}
                placeholder="Weiss nicht – bei allen Fundstellen melden"
                options={(organisations.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
              />
            )}
          </Field>
        </CardSection>

        <CardSection title="Was haben Sie verloren?">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bezeichnung" required className="sm:col-span-2" error={errors.title?.message} hint="z. B. Schwarzer Rucksack">
              {(p) => <Input {...p} {...form.register('title')} />}
            </Field>
            <Field label="Kategorie" required error={errors.category?.message}>
              {(p) => <Select {...p} {...form.register('category')} placeholder="Bitte wählen" options={toOptions(CATEGORY_LABELS)} />}
            </Field>
            <Field label="Farbe" required error={errors.color?.message}>
              {(p) => <Select {...p} {...form.register('color')} placeholder="Bitte wählen" options={toOptions(COLOR_LABELS)} />}
            </Field>
            <Field label="Marke" error={errors.brand?.message}>
              {(p) => <Input {...p} {...form.register('brand')} />}
            </Field>
            <Field label="Verloren am" required error={errors.lostOn?.message} hint="Unsicher? Wählen Sie den frühesten möglichen Tag.">
              {(p) => (
                <div className="space-y-2">
                  <Input type="date" max={todayIso()} {...p} {...form.register('lostOn')} />
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Datum schnell wählen">
                    {DATE_SHORTCUTS.map(({ label, days }) => {
                      const value = daysAgo(days)
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => form.setValue('lostOn', value, { shouldDirty: true, shouldValidate: true })}
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition',
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
            <Field label="Ort des Verlusts" className="sm:col-span-2" error={errors.lostLocation?.message}>
              {(p) => <Input {...p} {...form.register('lostLocation')} />}
            </Field>
            <Field
              label="Beschreibung"
              className="sm:col-span-2"
              hint="Allgemeine Beschreibung. Ganz persönliche Merkmale geben Sie besser erst bei einer Rückgabeanfrage an."
              error={errors.description?.message}
            >
              {(p) => <Textarea {...p} {...form.register('description')} />}
            </Field>
          </div>
        </CardSection>

        {liveMatches.length > 0 && (
          <CardSection
            title="Ist es vielleicht einer davon?"
            description="Diese Funde passen zu Ihren Angaben. Öffnen Sie einen Treffer, um direkt die Rückgabe anzufragen – Ihre Eingaben hier bleiben erhalten."
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
                        <ColorDot color={item.color} /> gefunden am {formatDate(item.foundOn)} · {lookup.get(item.organisationId)?.name}
                      </span>
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-stone-400" aria-label="öffnet in neuem Tab" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardSection>
        )}

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

        {mutation.isError && <Alert tone="error">{toUserMessage(mutation.error)}</Alert>}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <RequiredNote />
          <Button type="submit" size="lg" loading={mutation.isPending}>
            Verlust melden
          </Button>
        </div>
      </form>
    </div>
  )
}
