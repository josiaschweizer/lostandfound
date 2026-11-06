import { Link } from 'react-router'
import { MailX } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { formatDateTime } from '@/domain/dates'
import { Alert, Badge, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Card, PageHeader } from '@/components/ui/Layout'
import { useOutbox } from './queries'

const TONES = { pending: 'amber', sent: 'green', failed: 'red', skipped: 'neutral' } as const

export const OutboxPage = () => {
  const outbox = useOutbox()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.admin.outbox.title} />
      <Alert className="mb-5">{t.admin.outbox.lead}</Alert>
      {outbox.isPending && <Spinner />}
      {outbox.isError && <ErrorState error={outbox.error} onRetry={() => outbox.refetch()} />}
      {outbox.isSuccess && outbox.data.length === 0 && <EmptyState icon={<MailX className="size-6" />} title={t.admin.outbox.empty} />}
      <ul className="space-y-3">
        {(outbox.data ?? []).map((email) => (
          <li key={email.id}>
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
                <Badge tone={TONES[email.deliveryStatus]}>{t.labels.deliveryStatus[email.deliveryStatus]}</Badge>
                <span>{formatDateTime(email.createdAt)}</span>
                <span>· {email.returnRequestId ? t.admin.outbox.relatesClaim : email.lossReportId ? t.admin.outbox.relatesLoss : ''}</span>
              </div>
              <p className="mt-1 text-sm text-stone-700">{t.admin.outbox.to(email.recipient ?? '')}</p>
              <p className="mt-1 font-semibold">{email.subject}</p>
              <p className="mt-1 whitespace-pre-line text-stone-800">{email.body}</p>
              {email.linkPath && (
                <Link to={email.linkPath} className="mt-1 inline-flex min-h-11 items-center font-medium text-brand-700 underline underline-offset-2">
                  {t.admin.outbox.openLink}
                </Link>
              )}
              {email.deliveryNote && email.deliveryStatus !== 'sent' && <p className="mt-1 text-sm text-stone-600">{email.deliveryNote}</p>}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
