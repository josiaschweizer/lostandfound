import { useParams } from 'react-router'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { ORGANISATION_TYPE_LABELS } from '@/domain/labels'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Badge, Card } from '@/components/ui/Layout'
import { CatalogBrowser } from './CatalogBrowser'
import { useOrganisation } from './queries'

/** Öffentliche Fundstellen-Seite einer Organisation mit eigenem Fundkatalog. */
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
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
          <div>
            <Badge tone="violet">{ORGANISATION_TYPE_LABELS[org.type]}</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{org.name}</h1>
            <p className="mt-1 text-stone-600">{office.name}</p>
            <div className="mt-5 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
              <p className="flex gap-2">
                <MapPin className="size-4 shrink-0 text-stone-400" aria-hidden />
                <span>
                  {office.location}
                  <br />
                  <span className="text-stone-500">{org.address}</span>
                </span>
              </p>
              <p className="flex gap-2">
                <Clock className="size-4 shrink-0 text-stone-400" aria-hidden />
                {office.openingHours}
              </p>
              <p className="flex gap-2">
                <Mail className="size-4 shrink-0 text-stone-400" aria-hidden />
                <a href={`mailto:${office.contactEmail}`} className="text-brand-700 hover:underline">
                  {office.contactEmail}
                </a>
              </p>
              {office.contactPhone && (
                <p className="flex gap-2">
                  <Phone className="size-4 shrink-0 text-stone-400" aria-hidden />
                  {office.contactPhone}
                </p>
              )}
            </div>
            {office.pickupNotes && <p className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">Abholhinweis: {office.pickupNotes}</p>}
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <ButtonLink to={`/verlust-melden?org=${org.id}`} variant="secondary">
              Verlust hier melden
            </ButtonLink>
          </div>
        </div>
      </Card>

      <section aria-labelledby="org-catalog">
        <h2 id="org-catalog" className="mb-4 text-xl font-semibold">
          Fundkatalog
        </h2>
        <CatalogBrowser organisationId={org.id} />
      </section>
    </div>
  )
}
