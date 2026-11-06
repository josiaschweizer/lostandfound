import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { LogIn } from 'lucide-react'
import { z } from 'zod'
import { t } from '@/i18n/de-CH'
import { useAuth } from '@/app/auth'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, signIn } from '@/services/auth'
import { toUserMessage } from '@/services/errors'
import { Button } from '@/components/ui/Button'
import { Alert, Spinner } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Form'
import { Section } from '@/components/ui/Layout'

const schema = z.object({
  email: z.string().trim().email(t.admin.office.errors.email),
  password: z.string().min(1, t.admin.office.errors.required),
})
type FormValues = z.infer<typeof schema>

export const LoginPage = () => {
  const { initializing, session, membership, membershipLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const target = (location.state as { from?: string } | null)?.from ?? '/verwaltung'
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })
  const login = useMutation({
    mutationFn: ({ email, password }: FormValues) => signIn(email, password),
    onSuccess: () => navigate(target, { replace: true }),
  })

  if (initializing || (session && membershipLoading)) return <Spinner label={t.admin.login.checking} />
  if (session && membership) return <Navigate to={target} replace />

  const { errors } = form.formState
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      <h1 className="sr-only">{t.admin.login.title}</h1>
      <Section title={t.admin.login.title} description={t.admin.login.lead}>
        <form noValidate className="space-y-4" onSubmit={form.handleSubmit((values) => login.mutate(values))}>
          <Field label={t.admin.login.email} required error={errors.email?.message}>
            {(p) => <Input {...p} type="email" autoComplete="username" autoFocus {...form.register('email')} />}
          </Field>
          <Field label={t.admin.login.password} required error={errors.password?.message}>
            {(p) => <Input {...p} type="password" autoComplete="current-password" {...form.register('password')} />}
          </Field>
          {login.isError && <Alert tone="error">{toUserMessage(login.error)}</Alert>}
          {session && !membership && <Alert tone="warning">{t.admin.login.noMembership}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
            {t.admin.login.submit}
          </Button>
        </form>
      </Section>
      <Section title={t.admin.login.demoTitle} description={t.admin.login.demoLead}>
        <ul className="space-y-3">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.office} className="rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200">
              <p className="mb-2 font-semibold">{account.office}</p>
              <div className="flex flex-wrap gap-2">
                {(['admin', 'staff'] as const).map((role) => (
                  <Button
                    key={role}
                    variant="secondary"
                    size="sm"
                    icon={<LogIn className="size-4" aria-hidden />}
                    disabled={login.isPending}
                    onClick={() => login.mutate({ email: account[role], password: DEMO_PASSWORD })}
                    aria-label={`${account.office}: ${role === 'admin' ? t.admin.login.asAdmin : t.admin.login.asStaff}`}
                  >
                    {role === 'admin' ? t.admin.login.asAdmin : t.admin.login.asStaff}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
