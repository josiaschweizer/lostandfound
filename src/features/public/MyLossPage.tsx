import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router'
import { CheckCircle2, SearchX } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { formatDate, formatShortDate } from '@/domain/dates'
import { queryKeys } from '@/lib/queryKeys'
import { closeMyLoss } from '@/services/public'
import { toUserMessage } from '@/services/errors'
import { ColorLabels } from '@/components/items/ColorDot'
import { ITEM_GRID, ItemCard } from '@/components/items/ItemCard'
import { LossStatusBadge } from '@/components/items/StatusBadge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Disclosure } from '@/components/ui/Disclosure'
import { Card, DefinitionList, PageHeader } from '@/components/ui/Layout'
import { CopyLink } from './CopyLink'
import { EmailList } from './EmailList'
import { useMyLoss } from './queries'
import { AiStatusLine } from '@/features/ai/AiStatusLine'
import { useSemanticMatch } from '@/features/ai/useSemanticMatch'

/** «Meine Verlustmeldung» über den persönlichen Link (KONZEPT 5.8), mit Treffern direkt nach dem Absenden. */
export const MyLossPage = () => {
  const { token = '' } = useParams()
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const loss = useMyLoss(token)
  const close = useMutation({
    mutationFn: () => closeMyLoss(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myLoss(token) }),
  })
  // KI-Treffer im Hintergrund (KONZEPT 7.4): Regel-Treffer sind sofort da, KI-Treffer kommen dazu.
  const ai = useSemanticMatch(loss.data?.status === 'open' ? { token } : null, () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.myLoss(token) }),
  )

  if (loss.isPending) return <Spinner />
  if (loss.isError) return <ErrorState error={loss.error} onRetry={() => loss.refetch()} />
  if (!loss.data) return <EmptyState as="h1" title={t.myLoss.notFound} action={<ButtonLink to="/">{t.nav.home}</ButtonLink>} />

  const r = loss.data
  const lostWhen = r.lostDateUncertain || r.lostFrom !== r.lostTo ? t.myLoss.lostUnknown(formatShortDate(r.lostFrom), formatShortDate(r.lostTo)) : formatDate(r.lostFrom)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {params.get('neu') && (
        <Alert tone="success" title={t.myLoss.thanks}>
          {t.myLoss.thanksText}
        </Alert>
      )}
      <PageHeader eyebrow={t.myLoss.title} title={r.title} actions={<LossStatusBadge status={r.status} />} />

      {r.status === 'open' ? (
        <section aria-labelledby="matches-title" className="space-y-3">
          <div>
            <h2 id="matches-title" className="text-xl font-semibold">
              {t.myLoss.matchesTitle}
            </h2>
            <p className="text-stone-700">{t.myLoss.matchesHint}</p>
            <AiStatusLine
              running={ai.running}
              text={ai.running ? t.ai.matchRunning : r.matches.some((m) => m.source === 'ki') ? t.ai.matchFound(r.matches.filter((m) => m.source === 'ki').length) : null}
            />
          </div>
          {r.matches.length === 0 ? (
            <EmptyState icon={<SearchX className="size-6" />} title={t.myLoss.noMatches} action={<ButtonLink to="/suche" variant="secondary">{t.nav.search}</ButtonLink>}>
              {t.myLoss.noMatchesText}
            </EmptyState>
          ) : (
            <ul className={ITEM_GRID} aria-live="polite">
              {r.matches.map((match) => (
                <li key={match.id}>
                  <ItemCard item={match} officeName={match.organisationName} reasons={match.reasons} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <Alert tone="info" title={t.myLoss.closed} />
      )}

      <Card className="space-y-2 p-4 sm:p-6">
        <h2 className="text-lg font-semibold">{t.myLoss.yourLink}</h2>
        <p className="text-stone-700">{t.myLoss.yourLinkHint}</p>
        <CopyLink path={`/verlust/${token}`} />
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="mb-3 text-lg font-semibold">{t.myLoss.details}</h2>
        <DefinitionList
          items={[
            { label: t.common.category, value: t.labels.categories[r.category] },
            { label: t.common.color, value: r.colors.length > 0 ? <ColorLabels colors={r.colors} /> : null },
            { label: t.common.brand, value: r.brand },
            { label: t.loss.description, value: r.description },
            { label: t.myLoss.lostWhen, value: lostWhen },
            { label: t.loss.place, value: r.lostLocation },
            { label: t.myLoss.office, value: r.organisationName ?? t.myLoss.allOffices },
          ]}
        />
        {r.status === 'open' && (
          <div className="mt-5 border-t border-stone-100 pt-4">
            <Button variant="secondary" icon={<CheckCircle2 className="size-5" aria-hidden />} loading={close.isPending} onClick={() => close.mutate()} className="max-w-full whitespace-normal">
              {t.myLoss.close}
            </Button>
            {close.isError && <p className="mt-2 text-sm font-medium text-red-700">{toUserMessage(close.error)}</p>}
          </div>
        )}
      </Card>

      {r.emails.length > 0 && (
        <Disclosure title={t.myLoss.emails} summary={`${r.emails.length}`}>
          <EmailList emails={r.emails} />
        </Disclosure>
      )}
    </div>
  )
}
