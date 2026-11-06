import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Check, Lock, PackageCheck, X } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { formatDateTime } from '@/domain/dates'
import { completeClaim, decideClaim } from '@/services/staff'
import { toUserMessage } from '@/services/errors'
import { ItemImage } from '@/components/items/ItemImage'
import { ClaimStatusBadge, ItemStatusBadge } from '@/components/items/StatusBadge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Field, Textarea } from '@/components/ui/Form'
import { Card, DefinitionList, PageHeader, Section } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/toastContext'
import { EmailList } from '@/features/public/EmailList'
import { useClaims, useOutbox, useStaffItem } from './queries'
import { useInvalidate } from './useInvalidate'

type Mode = 'idle' | 'confirm' | 'reject'

/** Anfrage prüfen: «Woran erkennt die Person …» neben dem internen Merkmal; bestätigen in ≤ 3 Klicks (KONZEPT 5.7). */
export const ClaimDetailPage = () => {
  const { id = '' } = useParams()
  const claims = useClaims()
  const claim = claims.data?.find((c) => c.id === id)
  const item = useStaffItem(claim?.itemId ?? '')
  const outbox = useOutbox()
  const invalidate = useInvalidate()
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('idle')
  const [text, setText] = useState('')

  const decide = useMutation({
    mutationFn: ({ confirm }: { confirm: boolean }) => decideClaim(id, confirm, text),
    onSuccess: async (_, { confirm }) => {
      setMode('idle')
      await invalidate()
      toast({ message: confirm ? t.admin.claims.confirmedToast : t.admin.claims.rejectedToast })
    },
  })
  const complete = useMutation({
    mutationFn: () => completeClaim(id),
    onSuccess: async () => {
      await invalidate()
      toast({ message: t.admin.claims.completedToast })
    },
  })

  if (claims.isPending || (claim && item.isPending)) return <Spinner />
  if (claims.isError) return <ErrorState error={claims.error} onRetry={() => claims.refetch()} />
  if (!claim || !item.data) return <EmptyState as="h1" title={t.admin.claims.notFound} action={<ButtonLink to="/verwaltung/anfragen">{t.admin.claims.backToList}</ButtonLink>} />

  const data = item.data
  const others = (claims.data ?? []).filter((c) => c.itemId === claim.itemId && c.id !== claim.id && (c.status === 'open' || c.status === 'confirmed'))
  const otherConfirmed = others.some((c) => c.status === 'confirmed')
  const emails = (outbox.data ?? []).filter((email) => email.returnRequestId === claim.id)

  const openMode = (next: Mode) => {
    setMode(next)
    setText(next === 'confirm' ? t.admin.claims.confirmTemplate : t.admin.claims.rejectTemplate)
  }

  return (
    <div className="space-y-5">
      <ButtonLink to="/verwaltung/anfragen" variant="ghost" size="sm" icon={<ArrowLeft className="size-4" aria-hidden />} className="-ml-3">
        {t.admin.claims.backToList}
      </ButtonLink>
      <PageHeader title={claim.claimantName} eyebrow={t.admin.claims.title} actions={<ClaimStatusBadge status={claim.status} />} />

      {others.length > 0 && claim.status === 'open' && (
        <Alert tone="warning" title={t.admin.claims.others(others.length)}>
          {others.map((other, index) => (
            <span key={other.id}>
              {index > 0 && ', '}
              <Link to={`/verwaltung/anfragen/${other.id}`} className="font-medium underline">
                {other.claimantName}
              </Link>
            </span>
          ))}
        </Alert>
      )}

      <Section title={t.admin.claims.compare}>
        <Link to={`/verwaltung/funde/${data.id}`} className="mb-4 flex items-center gap-3 rounded-2xl p-1 hover:bg-stone-50">
          <ItemImage photoPath={data.photoPath} category={data.category} title={data.title} className="size-14 shrink-0 rounded-xl" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{data.title}</span>
            <span className="block font-mono text-sm text-stone-600">{data.itemNumber}</span>
          </span>
          <ItemStatusBadge status={data.status} />
        </Link>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200" data-testid="claim-recognition">
            <p className="text-sm font-semibold text-sky-900">{t.admin.claims.recognition}</p>
            <p className="mt-1 text-stone-900">{claim.recognitionText}</p>
            {claim.message && (
              <p className="mt-2 text-sm text-stone-700">
                {t.admin.claims.message}: {claim.message}
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-accent-50 p-4 ring-1 ring-accent-100" data-testid="claim-feature">
            <p className="flex items-center gap-1 text-sm font-semibold text-accent-700">
              <Lock className="size-4" aria-hidden /> {t.admin.claims.feature}
            </p>
            <p className="mt-1 text-stone-900">{data.identifyingFeature || <span className="text-stone-600">{t.admin.claims.noFeature}</span>}</p>
            <p className="mt-2 text-sm text-stone-700">
              {t.admin.itemDetail.storage}: {data.storageLocation}
            </p>
          </div>
        </div>
      </Section>

      <Card className="space-y-4 p-4 sm:p-6">
        {claim.status === 'open' && mode === 'idle' && (
          <div className="flex flex-wrap gap-2">
            <Button size="lg" icon={<Check className="size-5" aria-hidden />} disabled={otherConfirmed} onClick={() => openMode('confirm')}>
              {t.admin.claims.confirm}
            </Button>
            <Button size="lg" variant="danger" icon={<X className="size-5" aria-hidden />} onClick={() => openMode('reject')}>
              {t.admin.claims.reject}
            </Button>
            {otherConfirmed && <p className="w-full text-stone-700">{t.admin.claims.cannotConfirm}</p>}
          </div>
        )}
        {claim.status === 'confirmed' && mode === 'idle' && (
          <div className="space-y-3">
            {claim.pickupInstructions && <p className="whitespace-pre-line text-stone-800">{claim.pickupInstructions}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="lg" variant="success" icon={<PackageCheck className="size-5" aria-hidden />} loading={complete.isPending} onClick={() => complete.mutate()}>
                {t.admin.claims.complete}
              </Button>
              <Button variant="danger" icon={<X className="size-5" aria-hidden />} onClick={() => openMode('reject')}>
                {t.admin.claims.rejectLater}
              </Button>
            </div>
          </div>
        )}
        {(claim.status === 'rejected' || claim.status === 'completed') && claim.decisionNote && <p className="text-stone-800">{claim.decisionNote}</p>}

        {mode !== 'idle' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{mode === 'confirm' ? t.admin.claims.confirmTitle : t.admin.claims.rejectTitle}</h2>
            <Field label={mode === 'confirm' ? t.admin.claims.confirmText : t.admin.claims.rejectText}>
              {(p) => <Textarea {...p} rows={3} value={text} onChange={(e) => setText(e.target.value)} />}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button variant={mode === 'confirm' ? 'primary' : 'danger'} size="lg" loading={decide.isPending} onClick={() => decide.mutate({ confirm: mode === 'confirm' })}>
                {mode === 'confirm' ? t.admin.claims.confirmSend : t.admin.claims.rejectSend}
              </Button>
              <Button variant="ghost" size="lg" onClick={() => setMode('idle')}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        )}
        {decide.isError && <Alert tone="error">{toUserMessage(decide.error)}</Alert>}
        {complete.isError && <Alert tone="error">{toUserMessage(complete.error)}</Alert>}
      </Card>

      <Section title={t.admin.claims.person}>
        <DefinitionList
          items={[
            { label: t.claim.name, value: claim.claimantName },
            { label: t.claim.email, value: <a className="break-all text-brand-700 underline" href={`mailto:${claim.claimantEmail}`}>{claim.claimantEmail}</a> },
            { label: t.claim.phone, value: claim.claimantPhone },
            { label: t.claim.pickupPerson, value: claim.pickupByOther ? claim.pickupPersonName : null },
            { label: t.admin.claims.requestedAt, value: formatDateTime(claim.createdAt) },
          ]}
        />
      </Section>

      {emails.length > 0 && (
        <Section title={t.admin.claims.emails}>
          <EmailList emails={emails} />
        </Section>
      )}
    </div>
  )
}
