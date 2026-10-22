import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/app/useAuth'
import { signIn } from '@/services/auth'
import { toUserMessage } from '@/services/errors'
import { DemoLoginList } from '@/features/demo/DemoLoginList'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Form'
import { CardSection } from '@/components/ui/Layout'
import { loginSchema, type LoginForm } from './schemas'

export const LoginPage = () => {
  const { session, membership, membershipLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/verwaltung'
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const mutation = useMutation({
    mutationFn: (v: LoginForm) => signIn(v.email, v.password),
    onSuccess: () => navigate(redirectTo, { replace: true }),
  })

  if (session && !membershipLoading) return <Navigate to={membership ? redirectTo : '/registrieren'} replace />

  const { errors } = form.formState
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      <CardSection title="Anmelden" description="Für Mitarbeitende von Fundstellen.">
        <form noValidate onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <Field label="E-Mail-Adresse" required error={errors.email?.message}>
            {(p) => <Input type="email" autoComplete="email" {...p} {...form.register('email')} />}
          </Field>
          <Field label="Passwort" required error={errors.password?.message}>
            {(p) => <Input type="password" autoComplete="current-password" {...p} {...form.register('password')} />}
          </Field>
          {mutation.isError && <Alert tone="error">{toUserMessage(mutation.error)}</Alert>}
          <Button type="submit" className="w-full" loading={mutation.isPending}>
            Anmelden
          </Button>
          <p className="text-center text-sm text-stone-600">
            Noch keine Fundstelle?{' '}
            <Link to="/registrieren" className="font-medium text-brand-700 hover:underline">
              Organisation registrieren
            </Link>
          </p>
        </form>
      </CardSection>
      <CardSection title="Demo-Zugänge" description="Demo-Hilfe: Mit einem Klick als Mitarbeitende einer Beispiel-Organisation anmelden.">
        <DemoLoginList onDone={() => navigate('/verwaltung')} />
      </CardSection>
    </div>
  )
}
