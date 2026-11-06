import { Link } from 'react-router'
import { ChevronRight, Clock, MapPin } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { ErrorState, Spinner } from '@/components/ui/Feedback'
import { Card, PageHeader } from '@/components/ui/Layout'
import { useOffices } from './queries'

export const OfficesPage = () => {
  const offices = useOffices()
  return (
    <>
      <PageHeader title={t.office.listTitle} lead={t.office.listIntro} />
      {offices.isPending && <Spinner />}
      {offices.isError && <ErrorState error={offices.error} onRetry={() => offices.refetch()} />}
      <ul className="grid gap-3 md:grid-cols-2">
        {(offices.data ?? []).map((office) => (
          <li key={office.id}>
            <Card className="h-full">
              <Link to={`/o/${office.slug}`} className="flex h-full items-start gap-3 rounded-3xl p-4 transition hover:bg-stone-50 sm:p-5">
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="block text-lg font-semibold text-stone-900">{office.name}</span>
                  <span className="block text-sm text-stone-600">
                    {t.labels.organisationTypes[office.type]} · {office.address}
                  </span>
                  <span className="flex gap-2 text-stone-800">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
                    {office.dropOffLocation}
                  </span>
                  <span className="flex gap-2 text-stone-800">
                    <Clock className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
                    {office.openingHours}
                  </span>
                </span>
                <ChevronRight className="mt-1 size-5 shrink-0 text-stone-400" aria-hidden />
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </>
  )
}
