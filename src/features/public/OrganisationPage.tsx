import { useParams } from 'react-router'
import { ChevronDown, Clock, Mail, MapPin, Phone } from 'lucide-react'
import { ORGANISATION_TYPE_LABELS } from '@/domain/labels'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Badge, Card } from '@/components/ui/Layout'
import { CatalogBrowser } from './CatalogBrowser'
import { useOrganisation } from './queries'

export const OrganisationPage = () => {
  const { slug = '' } = useParams()
  const { data: org, isPending, isError, error } = useOrganisation(slug)

  if (isPending) return <Spinner />
  if (isError) return <ErrorState error={error} />
  if (!org)
    return (
      <EmptyState title="Organisation nicht gefunden" action={<ButtonLink to="/suche">Alle Fundstellen durchsuchen</ButtonLink>}>
        Der Link ist möglicherweise veraltet.
      </EmptyState>
    )

  const { office } = org
  return (
    <div className="space-y-6 sm:space-y-8">
      <Card className="p-4 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Badge tone="violet">{ORGANISATION_TYPE_LABELS[org.type]}</Badge>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:mt-3 sm:text-3xl">{org.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
              <Clock className="size-4 shrink-0 text-stone-400" aria-hidden />
              {office.openingHours}
            </p>
          </div>
          <ButtonLink to={`/verlust-melden?org=${org.id}`} variant="secondary" className="max-sm:w-full">
            Verlust hier melden
          </ButtonLink>
        </div>
        <details className="group mt-4 border-t border-stone-100 pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-brand-700 [&::-webkit-details-marker]:hidden">
            Kontakt & Abholung
            <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-3 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
            <p className="flex gap-2">
              <MapPin className="size-4 shrink-0 text-stone-400" aria-hidden />
              <span>
                {office.name}, {office.location}
                <br />
                <span className="text-stone-500">{org.address}</span>
              </span>
            </p>
            <p className="flex gap-2">
              <Mail className="size-4 shrink-0 text-stone-400" aria-hidden />
              <a href={`mailto:${office.contactEmail}`} className="break-all text-brand-700 hover:underline">
                {office.contactEmail}
              </a>
            </p>
            {office.contactPhone && (
              <p className="flex gap-2">
                <Phone className="size-4 shrink-0 text-stone-400" aria-hidden />
                {office.contactPhone}
              </p>
            )}
            {office.pickupNotes && <p className="rounded-lg bg-stone-50 p-3 text-stone-600 sm:col-span-2">Abholhinweis: {office.pickupNotes}</p>}
          </div>
        </details>
      </Card>

      <section aria-labelledby="org-catalog">
        <h2 id="org-catalog" className="mb-3 text-lg font-semibold sm:mb-4 sm:text-xl">
          Fundkatalog
        </h2>
        <CatalogBrowser organisationId={org.id} />
      </section>
    </div>
  )
}
