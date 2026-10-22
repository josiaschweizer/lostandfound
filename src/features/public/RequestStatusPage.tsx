import { Link, useParams } from 'react-router'
import { formatDateTime } from '@/domain/dates'
import type { RequestStatus } from '@/domain/types'
import { RequestStatusBadge } from '@/components/items/StatusBadges'
import { SimulatedEmailCard } from '@/components/items/SimulatedEmailCard'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { CardSection, DefinitionList, PageHeader } from '@/components/ui/Layout'
import { useRequestStatus } from './queries'

const STATUS_MESSAGES: Record<RequestStatus, { tone: 'info' | 'success' | 'error'; title: string; text: string }> = {
  open: { tone: 'info', title: 'In Prüfung', text: 'Die Fundstelle vergleicht Ihre Angaben mit ihren internen Merkmalen.' },
  confirmed: { tone: 'success', title: 'Bestätigt – bereit zur Abholung', text: 'Bitte holen Sie den Gegenstand gemäss den Hinweisen ab.' },
  rejected: { tone: 'error', title: 'Abgelehnt', text: 'Ihre Angaben reichten nicht als Eigentumsnachweis.' },
  completed: { tone: 'success', title: 'Übergeben', text: 'Der Gegenstand wurde Ihnen übergeben.' },
}

/** Statusseite einer Rückgabeanfrage (nur über geheimen Link erreichbar). */
export const RequestStatusPage = () => {
  const { token = '' } = useParams()
  const { data, isPending, isError, error } = useRequestStatus(token)

  if (isPending) return <Spinner />
  if (isError) return <ErrorState error={error} />
  if (!data) return <EmptyState title="Anfrage nicht gefunden">Bitte prüfen Sie den Link aus Ihrer Bestätigung.</EmptyState>

  const message = STATUS_MESSAGES[data.status]
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Ihre Rückgabeanfrage" title={data.item.title} actions={<RequestStatusBadge status={data.status} />} />
      <Alert tone={message.tone} title={message.title}>
        {message.text}
        {data.decisionNote && <p className="mt-1">Hinweis der Fundstelle: {data.decisionNote}</p>}
      </Alert>
      {data.status === 'confirmed' && data.pickupInstructions && (
        <CardSection title="Abholhinweise">
          <p className="mb-4 whitespace-pre-line text-stone-800">{data.pickupInstructions}</p>
          <DefinitionList
            items={[
              { label: 'Ort', value: data.office.location },
              { label: 'Öffnungszeiten', value: data.office.openingHours },
              { label: 'Fundnummer', value: <span className="font-mono">{data.item.itemNumber}</span> },
            ]}
          />
        </CardSection>
      )}
      <CardSection title="Übersicht">
        <DefinitionList
          items={[
            { label: 'Gegenstand', value: data.item.title },
            { label: 'Fundnummer', value: <span className="font-mono">{data.item.itemNumber}</span> },
            { label: 'Fundstelle', value: <Link className="text-brand-700 hover:underline" to={`/o/${data.organisation.slug}`}>{data.organisation.name}</Link> },
            { label: 'Gesendet', value: formatDateTime(data.createdAt) },
            { label: 'Entschieden', value: data.decidedAt ? formatDateTime(data.decidedAt) : null },
            { label: 'Kontakt Fundstelle', value: data.office.contactEmail },
          ]}
        />
      </CardSection>
      <CardSection title="Nachrichten" description="Diese Nachrichten erhalten Sie per E-Mail (sofern der Versand eingerichtet ist).">
        <div className="space-y-3">
          {data.emails.map((email) => (
            <SimulatedEmailCard key={email.id} email={email} />
          ))}
        </div>
      </CardSection>
    </div>
  )
}
