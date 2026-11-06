import { useState } from 'react'
import { useParams } from 'react-router'
import { ArrowLeft, Hand } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { formatDate } from '@/domain/dates'
import { ColorLabels } from '@/components/items/ColorDot'
import { ItemImage } from '@/components/items/ItemImage'
import { OfficeInfo } from '@/components/items/OfficeInfo'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Card, DefinitionList } from '@/components/ui/Layout'
import { ClaimForm } from './ClaimForm'
import { useOfficeMap, usePublicItem } from './queries'

/** Fund-Detail (KONZEPT 5.4): öffentliche Angaben, Abholinfos immer sichtbar, Button «Das gehört mir». */
export const ItemPage = () => {
  const { fundnummer = '' } = useParams()
  const item = usePublicItem(fundnummer)
  const offices = useOfficeMap()
  const [claimOpen, setClaimOpen] = useState(false)

  if (item.isPending) return <Spinner />
  if (item.isError) return <ErrorState error={item.error} onRetry={() => item.refetch()} />
  if (!item.data)
    return (
      <EmptyState as="h1" title={t.itemPage.notAvailable} action={<ButtonLink to="/suche">{t.itemPage.toSearch}</ButtonLink>}>
        {t.itemPage.notAvailableText}
      </EmptyState>
    )

  const data = item.data
  const office = offices.get(data.organisationId)

  return (
    <div className="space-y-5">
      <ButtonLink to="/suche" variant="ghost" size="sm" icon={<ArrowLeft className="size-4" aria-hidden />} className="-ml-3">
        {t.itemPage.backToSearch}
      </ButtonLink>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <Card className="overflow-hidden">
          <ItemImage photoPath={data.photoPath} category={data.category} title={data.title} className="aspect-[4/3] w-full sm:aspect-[16/10]" />
          <div className="space-y-4 p-4 sm:p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-brand-700">{t.labels.categories[data.category]}</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{data.title}</h1>
              {data.status === 'reserved' && <Badge tone="amber">{t.labels.publicItemStatus.reserved}</Badge>}
              {data.publicDescription && <p className="text-stone-800">{data.publicDescription}</p>}
            </div>
            <DefinitionList
              items={[
                { label: t.common.itemNumber, value: <span className="font-mono">{data.itemNumber}</span> },
                { label: t.common.foundOn, value: formatDate(data.foundOn) },
                { label: t.common.place, value: data.foundLocation },
                { label: t.common.color, value: <ColorLabels colors={data.colors} /> },
                { label: t.common.brand, value: data.brand },
              ]}
            />
          </div>
        </Card>

        <div className="space-y-5">
          {office && (
            <Card className="p-4 sm:p-6">
              <OfficeInfo office={office} title={t.itemPage.whereToPick} />
            </Card>
          )}
          <Card className="p-4 sm:p-6" >
            <section aria-labelledby="claim-title" className="space-y-4">
              <div>
                <h2 id="claim-title" className="text-lg font-semibold">
                  {t.itemPage.claimTitle}
                </h2>
                <p className="text-stone-700">{t.itemPage.claimLead}</p>
              </div>
              {claimOpen ? (
                <ClaimForm itemId={data.id} itemTitle={data.title} />
              ) : (
                <Button size="lg" className="w-full" icon={<Hand className="size-5" aria-hidden />} onClick={() => setClaimOpen(true)}>
                  {t.itemPage.claimButton}
                </Button>
              )}
            </section>
          </Card>
        </div>
      </div>
    </div>
  )
}
