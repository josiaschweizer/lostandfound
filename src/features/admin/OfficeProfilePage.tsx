import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { z } from 'zod'
import { t } from '@/i18n/de-CH'
import { useStaff } from '@/app/auth'
import { updateOfficeProfile } from '@/services/staff'
import { toUserMessage } from '@/services/errors'
import { OfficeInfo } from '@/components/items/OfficeInfo'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Field, Input, RequiredLegend, Textarea } from '@/components/ui/Form'
import { PageHeader, Section } from '@/components/ui/Layout'

const e = t.admin.office.errors
const schema = z.object({
  dropOffLocation: z.string().trim().min(1, e.required).max(200),
  openingHours: z.string().trim().min(1, e.required).max(200),
  pickupRules: z.string().trim().max(1000),
  contactEmail: z.string().trim().email(e.email),
  contactPhone: z.string().trim().max(40),
  retentionDays: z.coerce.number<string>().int().min(1, e.retention).max(3650, e.retention),
})
type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

/** Fundstellen-Profil (nur Admin): Abgabeort, Öffnungszeiten, Abholregeln, Aufbewahrungsfrist. */
export const OfficeProfilePage = () => {
  const { organisation, isAdmin } = useStaff()
  const queryClient = useQueryClient()
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      dropOffLocation: organisation.dropOffLocation,
      openingHours: organisation.openingHours,
      pickupRules: organisation.pickupRules ?? '',
      contactEmail: organisation.contactEmail,
      contactPhone: organisation.contactPhone ?? '',
      retentionDays: String(organisation.retentionDays),
    },
  })
  const save = useMutation({
    mutationFn: updateOfficeProfile,
    onSuccess: () => queryClient.invalidateQueries(),
  })
  const { errors } = form.formState

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title={t.admin.office.title}
        lead={t.admin.office.lead}
        actions={
          <ButtonLink to={`/o/${organisation.slug}`} variant="ghost" icon={<ExternalLink className="size-4" aria-hidden />}>
            {t.admin.office.publicPage}
          </ButtonLink>
        }
      />
      {!isAdmin ? (
        <Section title={organisation.name} description={t.admin.office.onlyAdmins}>
          <OfficeInfo office={organisation} linkName={false} />
        </Section>
      ) : (
        <Section title={organisation.name}>
          <form noValidate className="space-y-4" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
            <RequiredLegend />
            <Field label={t.admin.office.dropOff} required error={errors.dropOffLocation?.message}>
              {(p) => <Input {...p} {...form.register('dropOffLocation')} />}
            </Field>
            <Field label={t.admin.office.hours} required error={errors.openingHours?.message}>
              {(p) => <Input {...p} {...form.register('openingHours')} />}
            </Field>
            <Field label={t.admin.office.rules} error={errors.pickupRules?.message}>
              {(p) => <Textarea {...p} rows={3} {...form.register('pickupRules')} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.admin.office.email} required error={errors.contactEmail?.message}>
                {(p) => <Input {...p} type="email" {...form.register('contactEmail')} />}
              </Field>
              <Field label={t.admin.office.phone} error={errors.contactPhone?.message}>
                {(p) => <Input {...p} type="tel" {...form.register('contactPhone')} />}
              </Field>
            </div>
            <Field label={t.admin.office.retention} required error={errors.retentionDays?.message}>
              {(p) => <Input {...p} type="number" min={1} max={3650} className="max-w-40" {...form.register('retentionDays')} />}
            </Field>
            {save.isSuccess && <Alert tone="success">{t.admin.office.saved}</Alert>}
            {save.isError && <Alert tone="error">{toUserMessage(save.error)}</Alert>}
            <Button type="submit" loading={save.isPending}>
              {t.common.save}
            </Button>
          </form>
        </Section>
      )}
    </div>
  )
}
