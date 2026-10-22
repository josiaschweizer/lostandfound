import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { useStaffContext } from '@/app/useAuth'
import { ORGANISATION_TYPE_LABELS } from '@/domain/labels'
import { toUserMessage } from '@/services/errors'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Field, Input, RequiredNote, Textarea } from '@/components/ui/Form'
import { CardSection, DefinitionList, PageHeader } from '@/components/ui/Layout'
import { useUpdateOffice } from './queries'
import { officeSettingsSchema, type OfficeSettingsForm } from './schemas'

export const OfficeSettingsPage = () => {
  const { organisation, membership } = useStaffContext()
  const { office } = organisation
  const update = useUpdateOffice()
  const form = useForm<OfficeSettingsForm>({
    resolver: zodResolver(officeSettingsSchema),
    defaultValues: {
      name: office.name,
      location: office.location,
      contactEmail: office.contactEmail,
      contactPhone: office.contactPhone ?? '',
      openingHours: office.openingHours,
      pickupNotes: office.pickupNotes ?? '',
    },
  })
  const { errors } = form.formState
  const publicUrl = `${window.location.origin}/o/${organisation.slug}`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Fundstelle" description="Angaben, die Suchende auf Ihrer öffentlichen Seite sehen." />
      <CardSection title="Organisation">
        <DefinitionList
          items={[
            { label: 'Name', value: organisation.name },
            { label: 'Art', value: ORGANISATION_TYPE_LABELS[organisation.type] },
            { label: 'Adresse', value: organisation.address },
            { label: 'Kürzel Fundnummern', value: <span className="font-mono">{organisation.shortCode}</span> },
            { label: 'Angemeldet als', value: membership.fullName },
            { label: 'Öffentliche Seite', value: <Link className="break-all text-brand-700 hover:underline" to={`/o/${organisation.slug}`}>{publicUrl}</Link> },
          ]}
        />
      </CardSection>
      <CardSection title="Fundstelle bearbeiten">
        <form noValidate className="space-y-4" onSubmit={form.handleSubmit((input) => update.mutate({ officeId: office.id, input }))}>
          <RequiredNote />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bezeichnung" required error={errors.name?.message}>
              {(p) => <Input {...p} {...form.register('name')} />}
            </Field>
            <Field label="Ort" required error={errors.location?.message}>
              {(p) => <Input {...p} {...form.register('location')} />}
            </Field>
            <Field label="Kontakt-E-Mail" required error={errors.contactEmail?.message}>
              {(p) => <Input type="email" {...p} {...form.register('contactEmail')} />}
            </Field>
            <Field label="Telefon" error={errors.contactPhone?.message}>
              {(p) => <Input type="tel" {...p} {...form.register('contactPhone')} />}
            </Field>
          </div>
          <Field label="Öffnungszeiten" required error={errors.openingHours?.message}>
            {(p) => <Input {...p} {...form.register('openingHours')} />}
          </Field>
          <Field label="Abholhinweise" error={errors.pickupNotes?.message}>
            {(p) => <Textarea {...p} {...form.register('pickupNotes')} />}
          </Field>
          {update.isSuccess && <Alert tone="success">Gespeichert.</Alert>}
          {update.isError && <Alert tone="error">{toUserMessage(update.error)}</Alert>}
          <div className="flex justify-end">
            <Button type="submit" loading={update.isPending}>
              Speichern
            </Button>
          </div>
        </form>
      </CardSection>
    </div>
  )
}
