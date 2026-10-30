import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router'
import { saveLink } from '@/lib/localTokens'
import { submitReturnRequest } from '@/services/requests'
import { toUserMessage } from '@/services/errors'
import type { FoundItem } from '@/domain/types'
import { ActionBar } from '@/components/ui/ActionBar'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Field, Input, RequiredNote, Textarea } from '@/components/ui/Form'
import { ContactHint } from './ContactHint'
import { returnRequestSchema, type ReturnRequestForm as FormValues } from './schemas'

export const ReturnRequestForm = ({ item }: { item: FoundItem }) => {
  const [token, setToken] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(returnRequestSchema),
    defaultValues: { name: '', contact: '', message: '', proof: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: FormValues) => submitReturnRequest(item.id, values),
    onSuccess: (newToken) => {
      saveLink({ kind: 'request', token: newToken, title: item.title, createdAt: new Date().toISOString() })
      setToken(newToken)
    },
  })

  const contact = useWatch({ control: form.control, name: 'contact' })

  if (token) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Anfrage gesendet">
          Die Fundstelle prüft Ihre Angaben und meldet sich bei Ihnen. Der Gegenstand wird erst nach der Prüfung für Sie reserviert.
        </Alert>
        <p className="text-sm text-stone-600">
          Den Stand Ihrer Anfrage sehen Sie jederzeit hier:{' '}
          <Link to={`/status/anfrage/${token}`} className="font-medium text-brand-700 underline underline-offset-2">
            Anfrage verfolgen
          </Link>
          . Sie finden sie auch unter «Meine Anfragen» im Menü und – bei Angabe einer E-Mail-Adresse – in der Bestätigung per E-Mail.
        </p>
      </div>
    )
  }

  const { errors } = form.formState
  return (
    <form noValidate onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
      <RequiredNote />
      <Field label="Name" required error={errors.name?.message}>
        {(p) => <Input autoComplete="name" {...p} {...form.register('name')} />}
      </Field>
      <Field label="Kontaktadresse" required hint={<ContactHint value={contact} />} error={errors.contact?.message}>
        {(p) => <Input autoComplete="email" {...p} {...form.register('contact')} />}
      </Field>
      <Field
        label="Besonderes Merkmal (Eigentumsnachweis)"
        required
        hint="Etwas, das nur Sie wissen können – z. B. Aufkleber, Gravur, Inhalt, Beschädigung."
        error={errors.proof?.message}
      >
        {(p) => <Textarea rows={3} {...p} {...form.register('proof')} />}
      </Field>
      <Field label="Nachricht" hint="z. B. wann und wo Sie den Gegenstand verloren haben" error={errors.message?.message}>
        {(p) => <Textarea rows={3} {...p} {...form.register('message')} />}
      </Field>
      {mutation.isError && <Alert tone="error">{toUserMessage(mutation.error)}</Alert>}
      <ActionBar>
        <Button type="submit" size="lg" loading={mutation.isPending}>
          Rückgabe anfragen
        </Button>
      </ActionBar>
    </form>
  )
}
