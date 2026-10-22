import { useMutation } from '@tanstack/react-query'
import { LogIn } from 'lucide-react'
import { signIn } from '@/services/auth'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/services/demo'
import { toUserMessage } from '@/services/errors'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'

/** Demo-Hilfe: Anmeldung als Mitarbeitende einer Beispiel-Organisation. */
export const DemoLoginList = ({ onDone }: { onDone?: () => void }) => {
  const mutation = useMutation({ mutationFn: (email: string) => signIn(email, DEMO_PASSWORD), onSuccess: onDone })
  return (
    <div className="space-y-2">
      {DEMO_ACCOUNTS.map((account) => (
        <Button
          key={account.email}
          variant="secondary"
          className="h-auto w-full justify-between py-2.5 text-left"
          loading={mutation.isPending && mutation.variables === account.email}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(account.email)}
        >
          <span>
            <span className="block font-medium">{account.organisation}</span>
            <span className="block text-xs font-normal text-stone-500">als {account.name}</span>
          </span>
          <LogIn className="size-4 text-stone-400" aria-hidden />
        </Button>
      ))}
      <p className="pt-1 text-xs text-stone-500">Passwort für alle Demo-Zugänge: <code className="font-mono">{DEMO_PASSWORD}</code></p>
      {mutation.isError && <Alert tone="error">{toUserMessage(mutation.error)}</Alert>}
    </div>
  )
}
