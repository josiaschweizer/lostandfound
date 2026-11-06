import { useParams } from 'react-router'
import { t } from '@/i18n/de-CH'
import { formatDateTime } from '@/domain/dates'
import { ItemImage } from '@/components/items/ItemImage'
import { ClaimStatusBadge } from '@/components/items/StatusBadge'
import { ButtonLink } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Disclosure } from '@/components/ui/Disclosure'
import { Card, DefinitionList, PageHeader } from '@/components/ui/Layout'
import { cn } from '@/components/ui/cn'
import { EmailList } from './EmailList'
import { useMyClaim } from './queries'

const TONES = { open: 'info', confirmed: 'success', rejected: 'warning', completed: 'success' } as const

/** «Meine Anfrage» über den persönlichen Link. Abholort und Zeiten erst nach der Bestätigung. */
export const MyClaimPage = () => {
  const { token = '' } = useParams()
  const claim = useMyClaim(token)

  if (claim.isPending) return <Spinner />
  if (claim.isError) return <ErrorState error={claim.error} onRetry={() => claim.refetch()} />
  if (!claim.data) return <EmptyState as="h1" title={t.myClaim.notFound} action={<ButtonLink to="/">{t.nav.home}</ButtonLink>} />

  const c = claim.data
  const reached = { open: 1, confirmed: 2, completed: 3, rejected: 1 }[c.status]

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow={t.myClaim.title} title={c.item.title} actions={<ClaimStatusBadge status={c.status} />} />
      <Alert tone={TONES[c.status]} title={t.myClaim.status[c.status]}>
        {c.decisionNote && (
          <p>
            {t.myClaim.note}: {c.decisionNote}
          </p>
        )}
      </Alert>

      {c.status !== 'rejected' && (
        <ol className="grid gap-2 sm:grid-cols-3" aria-label={t.claim.doneTitle}>
          {t.claim.steps.map((step, index) => (
            <li key={step} className={cn('flex gap-3 rounded-2xl p-3 ring-1', index < reached ? 'bg-brand-50 ring-brand-200' : 'bg-white ring-stone-200')}>
              <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full font-semibold', index < reached ? 'bg-brand-600 text-white' : 'bg-stone-200 text-stone-700')}>
                {index + 1}
              </span>
              <span className="text-sm">{step}</span>
            </li>
          ))}
        </ol>
      )}

      {(c.status === 'confirmed' || c.status === 'completed') && c.office.dropOffLocation && (
        <Card className="space-y-3 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{t.myClaim.pickup}</h2>
          <DefinitionList
            items={[
              { label: t.common.office, value: c.office.name },
              { label: t.office.dropOff, value: c.office.dropOffLocation },
              { label: t.office.hours, value: c.office.openingHours },
              { label: t.office.rules, value: c.office.pickupRules },
              { label: t.common.itemNumber, value: <span className="font-mono">{c.item.itemNumber}</span> },
            ]}
          />
          {c.pickupInstructions && <p className="whitespace-pre-line text-stone-800">{c.pickupInstructions}</p>}
          <p className="font-medium">{t.myClaim.bringId}</p>
          {c.pickupByOther && c.pickupPersonName && <p>{t.myClaim.pickupBy(c.pickupPersonName)}</p>}
        </Card>
      )}

      <Card className="flex items-center gap-4 p-4 sm:p-5">
        <ItemImage photoPath={c.item.photoPath} category={c.item.category} title={c.item.title} className="size-16 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="font-semibold">{c.item.title}</p>
          <p className="font-mono text-sm text-stone-600">{c.item.itemNumber}</p>
          <p className="text-sm text-stone-600">
            {c.office.name} · {formatDateTime(c.createdAt)}
          </p>
        </div>
      </Card>

      {c.status === 'rejected' && <ButtonLink to="/suche">{t.myClaim.nextSearch}</ButtonLink>}

      {c.emails.length > 0 && (
        <Disclosure title={t.myClaim.emails} summary={`${c.emails.length}`}>
          <EmailList emails={c.emails} />
        </Disclosure>
      )}
    </div>
  )
}
