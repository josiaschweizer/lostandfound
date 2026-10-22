import { MailX } from 'lucide-react'
import { SimulatedEmailCard } from '@/components/items/SimulatedEmailCard'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Layout'
import { useOutbox } from './queries'

export const OutboxPage = () => {
  const outbox = useOutbox()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Postausgang" description="Benachrichtigungen Ihrer Fundstelle." />
      <Alert tone="warning" className="mb-6" title="Simulation">
        Im Prototyp werden keine echten E-Mails versendet. Die Nachrichten werden nur gespeichert und hier angezeigt.
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
