import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ExternalLink, PackagePlus } from 'lucide-react'
import { useAuth } from '@/app/useAuth'
import { ORGANISATION_TYPE_LABELS, toOptions } from '@/domain/labels'
import { queryKeys } from '@/lib/queryKeys'
import { registerOrganisation, signUp } from '@/services/auth'
import { toUserMessage } from '@/services/errors'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Alert, Spinner } from '@/components/ui/Feedback'
import { Field, Input, RequiredNote, Select, Textarea } from '@/components/ui/Form'
import { CardSection, PageHeader } from '@/components/ui/Layout'
import { accountSchema, setupSchema, type AccountForm, type SetupForm } from './schemas'
import { Stepper } from './Stepper'

const STEPS = ['Konto erstellen', 'Organisation & Fundstelle', 'Fertig']

export const RegisterPage = () => {
  const { session, membership, organisation, membershipLoading, initializing } = useAuth()
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)

  if (initializing || membershipLoading) return <Spinner />

  const step = createdSlug ? 2 : !session ? 0 : 1

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Organisation registrieren" description="In zwei Schritten zur eigenen Fundstelle mit öffentlicher Seite." />
      <Stepper steps={STEPS} current={membership && !createdSlug ? 2 : step} />

      {membership && !createdSlug ? (
        <Alert tone="info" title="Bereits eingerichtet">
          Ihr Konto gehört zu «{organisation?.name}». <Link className="font-medium underline" to="/verwaltung">Zur Verwaltung</Link>
        </Alert>
      ) : step === 0 ? (
        <AccountStep />
      ) : step === 1 ? (
        <SetupStep
          fullName={(session?.user.user_metadata.full_name as string | undefined) ?? ''}
          contactEmail={session?.user.email ?? ''}
          onDone={setCreatedSlug}
        />
      ) : (
        createdSlug && <DoneStep slug={createdSlug} />
      )}
    </div>
  )
}

const AccountStep = () => {
  const form = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: { fullName: '', email: '', password: '', passwordRepeat: '' },
  })
  const mutation = useMutation({ mutationFn: (v: AccountForm) => signUp(v.fullName, v.email, v.password) })
  const { errors } = form.formState
  return (
    <CardSection title="1. Konto erstellen" description="Das Konto der verantwortlichen Person.">
      <form noValidate onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <RequiredNote />
        <Field label="Name der verantwortlichen Person" required error={errors.fullName?.message}>
          {(p) => <Input autoComplete="name" {...p} {...form.register('fullName')} />}
        </Field>
        <Field label="E-Mail-Adresse" required error={errors.email?.message} hint="Im Prototyp wird keine Bestätigungs-E-Mail versendet.">
          {(p) => <Input type="email" autoComplete="email" {...p} {...form.register('email')} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Passwort" required error={errors.password?.message} hint="Mindestens 8 Zeichen">
            {(p) => <Input type="password" autoComplete="new-password" {...p} {...form.register('password')} />}
          </Field>
          <Field label="Passwort wiederholen" required error={errors.passwordRepeat?.message}>
            {(p) => <Input type="password" autoComplete="new-password" {...p} {...form.register('passwordRepeat')} />}
          </Field>
        </div>
        <Alert tone="warning">Prototyp: Bitte keine echten Personendaten und kein Passwort verwenden, das Sie anderswo nutzen.</Alert>
        {mutation.isError && <Alert tone="error">{toUserMessage(mutation.error)}</Alert>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-600">
            Bereits ein Konto?{' '}
            <Link to="/anmelden" className="font-medium text-brand-700 hover:underline">
              Anmelden
            </Link>
          </p>
          <Button type="submit" loading={mutation.isPending}>
            Konto erstellen und weiter
          </Button>
        </div>
      </form>
    </CardSection>
  )
}

interface SetupStepProps {
  fullName: string
  contactEmail: string
  onDone: (slug: string) => void
}

const SetupStep = ({ fullName, contactEmail, onDone }: SetupStepProps) => {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const form = useForm<SetupForm>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      organisationName: '',
      organisationType: '' as SetupForm['organisationType'],
      address: '',
      officeName: 'Fundstelle',
      officeLocation: '',
      contactEmail,
      contactPhone: '',
      openingHours: '',
      pickupNotes: '',
    },
  })
  const mutation = useMutation({
    mutationFn: (values: SetupForm) => registerOrganisation({ ...values, fullName: fullName || contactEmail }),
    onSuccess: async (slug) => {
      onDone(slug)
      await queryClient.invalidateQueries({ queryKey: queryKeys.membership(session?.user.id ?? '') })
      await queryClient.invalidateQueries({ queryKey: queryKeys.organisations })
    },
  })
  const { errors } = form.formState
  return (
    <form noValidate onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
      <RequiredNote />
      <CardSection title="Ihre Organisation" description="Zum Beispiel eine Schule, ein Fundbüro oder eine Firma.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name der Organisation" required className="sm:col-span-2" error={errors.organisationName?.message}>
            {(p) => <Input autoComplete="organization" {...p} {...form.register('organisationName')} />}
          </Field>
          <Field label="Art der Organisation" required error={errors.organisationType?.message}>
            {(p) => <Select {...p} {...form.register('organisationType')} placeholder="Bitte wählen" options={toOptions(ORGANISATION_TYPE_LABELS)} />}
          </Field>
          <Field label="Adresse" required error={errors.address?.message} hint="z. B. Musterstrasse 1, 8000 Musterstadt">
            {(p) => <Input autoComplete="street-address" {...p} {...form.register('address')} />}
          </Field>
        </div>
      </CardSection>

      <CardSection title="Fundstelle" description="Wo und wann können Suchende Gegenstände abholen? Diese Angaben stehen auf Ihrer öffentlichen Seite.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ort der Fundstelle" required error={errors.officeLocation?.message} hint="z. B. Empfang, Gebäude A, Raum 012">
            {(p) => <Input {...p} {...form.register('officeLocation')} />}
          </Field>
          <Field label="Öffnungszeiten" required error={errors.openingHours?.message} hint="z. B. Mo–Fr 08:00–12:00">
            {(p) => <Input {...p} {...form.register('openingHours')} />}
          </Field>
          <Field label="Kontakt-E-Mail" required error={errors.contactEmail?.message} hint="Vorausgefüllt mit Ihrer Konto-Adresse">
            {(p) => <Input type="email" {...p} {...form.register('contactEmail')} />}
          </Field>
          <Field label="Telefon" error={errors.contactPhone?.message}>
            {(p) => <Input type="tel" {...p} {...form.register('contactPhone')} />}
          </Field>
        </div>
        <details className="mt-4 rounded-lg bg-stone-50 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-stone-700">Weitere Angaben (optional)</summary>
          <div className="mt-3 space-y-4">
            <Field label="Bezeichnung der Fundstelle" error={errors.officeName?.message} hint="z. B. Empfang, Hauswartung">
              {(p) => <Input {...p} {...form.register('officeName')} />}
            </Field>
            <Field label="Abholhinweise" error={errors.pickupNotes?.message} hint="z. B. «Bitte Ausweis mitbringen.» Wird bei bestätigten Anfragen angezeigt.">
              {(p) => <Textarea {...p} {...form.register('pickupNotes')} />}
            </Field>
          </div>
        </details>
      </CardSection>

      {Object.keys(errors).length > 0 && <Alert tone="error">Bitte die markierten Felder prüfen.</Alert>}
      {mutation.isError && <Alert tone="error">{toUserMessage(mutation.error)}</Alert>}
      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={mutation.isPending}>
          Fundstelle einrichten
        </Button>
      </div>
    </form>
  )
}

const DoneStep = ({ slug }: { slug: string }) => (
  <CardSection title="Fertig – Ihre Fundstelle ist eingerichtet">
    <div className="space-y-4">
      <Alert tone="success" title="Organisation angelegt">
        Ihre öffentliche Fundstellen-Seite ist ab sofort erreichbar.
      </Alert>
      <p className="rounded-lg bg-stone-50 p-3 font-mono text-sm break-all">
        {window.location.origin}/o/{slug}
      </p>
      <div className="flex flex-wrap gap-2">
        <ButtonLink to="/verwaltung/neu" icon={<PackagePlus className="size-4" />}>
          Ersten Fundgegenstand erfassen
        </ButtonLink>
        <ButtonLink to="/verwaltung" variant="secondary">
          Zur Verwaltung
        </ButtonLink>
        <ButtonLink to={`/o/${slug}`} variant="ghost" icon={<ExternalLink className="size-4" />}>
          Öffentliche Seite öffnen
        </ButtonLink>
      </div>
    </div>
  </CardSection>
)
