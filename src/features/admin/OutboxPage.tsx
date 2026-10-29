import { MailX } from 'lucide-react'
import { SimulatedEmailCard } from '@/components/items/SimulatedEmailCard'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Layout'
import { useOutbox } from './queries'

export const OutboxPage = () => {
  const outbox = useOutbox()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Gesendete Nachrichten" description="Alle Benachrichtigungen Ihrer Fundstelle. Die Nachrichten zu einer Anfrage sehen Sie auch direkt bei der Anfrage." />
      <Alert tone="info" className="mb-6" title="Versand">
        Alle Nachrichten werden hier protokolliert. Ist der E-Mail-Versand eingerichtet (siehe README), gehen sie zusätzlich über Resend an echte
        Adressen. Erfundene Test-Adressen (z. B. @example.com) und Telefonnummern werden nie angeschrieben.
      </Alert>
      {outbox.isPending && <Spinner />}
      {outbox.isError && <ErrorState error={outbox.error} />}
      {outbox.isSuccess && outbox.data.length === 0 && <EmptyState icon={<MailX className="size-6" />} title="Noch keine Nachrichten" />}
      <div className="space-y-3">
        {outbox.data?.map((email) => (
          <SimulatedEmailCard key={email.id} email={email} />
        ))}
      </div>
    </div>
  )
}
