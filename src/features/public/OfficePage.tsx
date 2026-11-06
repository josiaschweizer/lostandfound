import { useParams } from 'react-router'
import { ClipboardList } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { OfficeInfo } from '@/components/items/OfficeInfo'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Card } from '@/components/ui/Layout'
import { CatalogSearch } from './CatalogSearch'
import { useOffices } from './queries'

/** Seite einer Fundstelle im Stil der Tenant-App: nur diese Fundstelle, direkt zur Suche und zur Meldung. */
export const OfficePage = () => {
  const { slug = '' } = useParams()
  const offices = useOffices()
  const office = offices.data?.find((o) => o.slug === slug)

  if (offices.isPending) return <Spinner />
  if (offices.isError) return <ErrorState error={offices.error} onRetry={() => offices.refetch()} />
  if (!office)
    return (
      <EmptyState as="h1" title={t.office.notFound} action={<ButtonLink to="/fundstellen">{t.office.listTitle}</ButtonLink>} />
    )

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <p className="text-sm font-medium text-brand-700">{t.labels.organisationTypes[office.type]}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{office.name}</h1>
        <div className="mt-4 grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
          <OfficeInfo office={office} linkName={false} />
          <ButtonLink to={`/verlust-melden?stelle=${office.slug}`} variant="secondary" icon={<ClipboardList className="size-5" aria-hidden />} className="max-md:w-full">
            {t.office.reportHere}
          </ButtonLink>
        </div>
      </Card>
      <section aria-labelledby="office-items" className="space-y-3">
        <h2 id="office-items" className="text-xl font-semibold">
          {t.office.searchHere}
        </h2>
        <CatalogSearch officeId={office.id} officeSlug={office.slug} />
      </section>
    </div>
  )
}
