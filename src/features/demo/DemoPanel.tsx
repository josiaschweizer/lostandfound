import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { useDock } from '@/app/dock'
import { useAuth } from '@/app/useAuth'
import { resolveDemoMode } from '@/lib/demoMode'
import { clearSavedLinks, linkPath, loadSavedLinks } from '@/lib/localTokens'
import { signIn, signOut } from '@/services/auth'
import { DEMO_ACCOUNTS, DEMO_PASSWORD, resetDemo } from '@/services/demo'
import { toUserMessage } from '@/services/errors'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/components/ui/cn'

/** Nur für Nutzertests und Präsentation – keine Funktion der echten Plattform (siehe demoMode.ts). */
export const DemoPanel = () => {
  const { openPanel, setOpenPanel } = useDock()
  const open = openPanel === 'demo'
  const setOpen = (value: boolean) => setOpenPanel(value ? 'demo' : null)
  const [confirmReset, setConfirmReset] = useState(false)
  const { session } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const links = open ? loadSavedLinks() : []

  const switchRole = useMutation({
    // Erst zur Zielseite wechseln, dann Sitzung ändern – so greift keine Weiterleitung zum Login.
    mutationFn: async (email: string | null) => {
      if (email) {
        await signIn(email, DEMO_PASSWORD)
      } else {
        await navigate('/')
        await signOut()
      }
      return email
    },
    onSuccess: (email) => {
      queryClient.removeQueries({ queryKey: ['staff'] })
      if (email) navigate('/verwaltung')
      setOpen(false)
    },
  })

  const reset = useMutation({
    mutationFn: async () => {
      await resetDemo()
      await navigate('/')
      if (session) await signOut()
      clearSavedLinks()
    },
    onSuccess: async () => {
      setConfirmReset(false)
      setOpen(false)
      await queryClient.resetQueries()
    },
  })

  const { search } = useLocation()
  const enabled = useMemo(() => resolveDemoMode(search), [search])

  const currentEmail = session?.user.email ?? null
  const roles = [{ email: null, label: 'Öffentliche Ansicht', sub: 'Suchende, ohne Anmeldung' }, ...DEMO_ACCOUNTS.map((a) => ({ email: a.email, label: a.organisation, sub: a.name }))]

  if (!enabled) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Demo-Hilfe"
        className="flex size-12 items-center justify-center gap-2 rounded-full bg-accent-600 text-sm font-medium text-white shadow-lg hover:bg-accent-700 sm:size-auto sm:px-4 sm:py-2.5"
      >
        <FlaskConical className="size-5 sm:size-4" aria-hidden />
        <span className="hidden sm:inline">Demo-Hilfe</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Demo-Hilfe">
        <p className="mb-2 text-xs font-medium text-stone-500 uppercase">Rolle wechseln</p>
        <ul className="space-y-1">
          {roles.map((role) => {
            const active = role.email === currentEmail || (!role.email && !currentEmail)
            return (
              <li key={role.label}>
                <button
                  type="button"
                  disabled={switchRole.isPending || active}
                  onClick={() => switchRole.mutate(role.email)}
                  className={cn('w-full rounded-lg px-3 py-2 text-left text-sm transition', active ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-stone-100')}
                >
                  <span className="block font-medium">{role.label}</span>
                  <span className="block text-xs text-stone-500">{active ? 'aktiv' : role.sub}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {links.length > 0 && (
          <>
            <p className="mt-4 mb-2 text-xs font-medium text-stone-500 uppercase">In diesem Browser gesendet</p>
            <ul className="max-h-32 space-y-1 overflow-auto text-sm">
              {links.map((link) => (
                <li key={link.token}>
                  <Link to={linkPath(link)} onClick={() => setOpen(false)} className="block truncate rounded px-2 py-1 text-brand-700 hover:bg-stone-100">
                    {link.kind === 'request' ? 'Anfrage' : 'Meldung'}: {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-4 border-t border-stone-200 pt-3">
          {confirmReset ? (
            <div className="space-y-2">
              <p className="text-xs text-stone-600">Alle Änderungen und neu registrierten Organisationen werden gelöscht. Fortfahren?</p>
              <div className="flex gap-2">
                <Button size="sm" variant="danger" loading={reset.isPending} onClick={() => reset.mutate()}>
                  Ja, zurücksetzen
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => setConfirmReset(true)}>
              Demo zurücksetzen
            </Button>
          )}
        </div>
        {(switchRole.isError || reset.isError) && (
          <Alert tone="error" className="mt-3">
            {toUserMessage(switchRole.error ?? reset.error)}
          </Alert>
        )}
      </Sheet>
    </>
  )
}
