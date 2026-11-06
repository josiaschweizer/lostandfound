import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router'
import { z } from 'zod'
import { t } from '@/i18n/de-CH'
import { saveLink } from '@/lib/savedLinks'
import { createClaim } from '@/services/public'
import { toUserMessage } from '@/services/errors'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Checkbox, Field, Input, RequiredLegend, Textarea } from '@/components/ui/Form'

const e = t.claim.errors
const schema = z
  .object({
    recognitionText: z.string().trim().min(10, e.recognition).max(1000, e.tooLong),
    email: z.string().trim().email(e.email).max(200, e.tooLong),
    name: z.string().trim().min(1, e.name).max(120, e.tooLong),
    phone: z.string().trim().max(40, e.tooLong),
    message: z.string().trim().max(1000, e.tooLong),
    pickupByOther: z.boolean(),
    pickupPersonName: z.string().trim().max(120, e.tooLong),
  })
  .refine((v) => !v.pickupByOther || v.pickupPersonName.length > 0, { path: ['pickupPersonName'], message: e.pickupPerson })

type FormValues = z.infer<typeof schema>

/** «Das gehört mir» – Rückgabe-Anfrage ohne Konto. Fehler erst nach Absenden oder Verlassen des Felds. */
export const ClaimForm = ({ itemId, itemTitle }: { itemId: string; itemTitle: string }) => {
  const [token, setToken] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { recognitionText: '', email: '', name: '', phone: '', message: '', pickupByOther: false, pickupPersonName: '' },
  })
  const pickupByOther = useWatch({ control: form.control, name: 'pickupByOther' })
  const mutation = useMutation({
    mutationFn: (values: FormValues) => createClaim({ itemId, ...values }),
    onSuccess: (newToken) => {
      saveLink({ kind: 'claim', token: newToken, title: itemTitle, createdAt: new Date().toISOString() })
      setToken(newToken)
    },
  })

  if (token) {
    return (
      <div className="space-y-4" data-testid="claim-done">
        <h3 className="text-lg font-semibold text-emerald-800">{t.claim.doneTitle}</h3>
        <ol className="space-y-3">
          {t.claim.steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 font-semibold text-white">{index + 1}</span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
        <p>
          <Link to={`/anfrage/${token}`} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-2">
            {t.claim.doneLink}
          </Link>
          <span className="block text-sm text-stone-600">{t.claim.doneLinkHint}</span>
        </p>
      </div>
    )
  }

  const { errors } = form.formState
  return (
    <form noValidate className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <RequiredLegend />
      <Field label={t.claim.recognition} required hint={t.claim.recognitionHint} error={errors.recognitionText?.message}>
        {(p) => <Textarea {...p} rows={3} {...form.register('recognitionText')} />}
      </Field>
      <Field label={t.claim.email} required hint={t.claim.emailHint} error={errors.email?.message}>
        {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.claim.name} required error={errors.name?.message}>
          {(p) => <Input {...p} autoComplete="name" {...form.register('name')} />}
        </Field>
        <Field label={`${t.claim.phone} (${t.common.optional})`} error={errors.phone?.message}>
          {(p) => <Input {...p} type="tel" autoComplete="tel" {...form.register('phone')} />}
        </Field>
      </div>
      <Field label={`${t.claim.message} (${t.common.optional})`} hint={t.claim.messageHint} error={errors.message?.message}>
        {(p) => <Textarea {...p} rows={2} {...form.register('message')} />}
      </Field>
      <Checkbox label={t.claim.pickupByOther} {...form.register('pickupByOther')} />
      {pickupByOther && (
        <Field label={t.claim.pickupPerson} required error={errors.pickupPersonName?.message}>
          {(p) => <Input {...p} autoComplete="off" {...form.register('pickupPersonName')} />}
        </Field>
      )}
      {mutation.isError && <Alert tone="error">{toUserMessage(mutation.error)}</Alert>}
      <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
        {t.claim.submit}
      </Button>
    </form>
  )
}
