import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { todayIso } from '@/domain/dates'
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
import { useOrganisations } from './queries'
import { lossReportSchema, type LossReportForm } from './schemas'

export const LossReportPage = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const organisations = useOrganisations()
  const form = useForm<LossReportForm>({
    resolver: zodResolver(lossReportSchema),
    defaultValues: {
      organisationId: params.get('org') ?? '',
      name: '',
      contact: '',
      title: '',
      category: '' as LossReportForm['category'],
      color: '' as LossReportForm['color'],
      brand: '',
      lostOn: '',
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
            label="Organisation"
            required
            hint={'Wählen Sie «Weiss nicht», wenn Sie den Ort nicht kennen – dann sehen alle Fundstellen Ihre Meldung.'}
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
            <Field label="Verloren am" required error={errors.lostOn?.message}>
              {(p) => <Input type="date" max={todayIso()} {...p} {...form.register('lostOn')} />}
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

        <CardSection title="Wie erreichen wir Sie?">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required error={errors.name?.message}>
              {(p) => <Input autoComplete="name" {...p} {...form.register('name')} />}
            </Field>
            <Field label="Kontaktadresse" required hint="E-Mail-Adresse oder Telefonnummer" error={errors.contact?.message}>
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
