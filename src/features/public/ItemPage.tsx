import { Link, useParams } from 'react-router'
import { BackLink } from '@/components/ui/BackLink'
import { formatDate } from '@/domain/dates'
import { CATEGORY_LABELS } from '@/domain/labels'
import { ColorDot, ItemImage } from '@/components/items/ItemVisual'
import { ItemStatusBadge } from '@/components/items/StatusBadges'
import { ButtonLink } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Card, CardSection, DefinitionList } from '@/components/ui/Layout'
import { usePublicItem, useOrganisationLookup } from './queries'
import { ReturnRequestForm } from './ReturnRequestForm'

/** Öffentliche Detailansicht – ohne interne Merkmale oder Aufbewahrungsort. */
export const ItemPage = () => {
  const { id = '' } = useParams()
  const { data: item, isPending, isError, error } = usePublicItem(id)
  const lookup = useOrganisationLookup()

  if (isPending) return <Spinner />
  if (isError) return <ErrorState error={error} />
  if (!item)
    return (
      <EmptyState title="Gegenstand nicht verfügbar" action={<ButtonLink to="/suche">Zur Suche</ButtonLink>}>
        Dieser Gegenstand wurde bereits zurückgegeben oder ist nicht öffentlich.
      </EmptyState>
    )

  const org = lookup.get(item.organisationId)
  return (
    <div className="space-y-6">
      <BackLink to="/suche" label="Zurück zur Suche" preferHistory />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <ItemImage photoPath={item.photoPath} category={item.category} title={item.title} className="aspect-16/10 w-full" />
            <div className="space-y-4 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-brand-700">{CATEGORY_LABELS[item.category]}</p>
                <ItemStatusBadge status={item.status} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
              {item.publicDescription && <p className="text-stone-700">{item.publicDescription}</p>}
              <DefinitionList
                items={[
                  { label: 'Fundnummer', value: <span className="font-mono">{item.itemNumber}</span> },
                  { label: 'Gefunden am', value: formatDate(item.foundOn) },
                  { label: 'Fundort', value: item.foundLocation },
                  { label: 'Farbe', value: <ColorDot color={item.color} /> },
                  { label: 'Marke', value: item.brand },
                ]}
              />
            </div>
          </Card>
          {org && (
            <CardSection title="Fundstelle">
              <DefinitionList
                items={[
                  { label: 'Organisation', value: <Link className="text-brand-700 hover:underline" to={`/o/${org.slug}`}>{org.name}</Link> },
                  { label: 'Ort', value: org.office.location },
                  { label: 'Öffnungszeiten', value: org.office.openingHours },
                  { label: 'Kontakt', value: org.office.contactEmail },
                ]}
              />
            </CardSection>
          )}
        </div>
        <CardSection title="Gehört dieser Gegenstand Ihnen?" description="Senden Sie eine Anfrage. Die Fundstelle vergleicht Ihre Angaben mit ihren internen Merkmalen.">
          {item.status === 'reserved' && (
            <Alert tone="warning" className="mb-4">
              Für diesen Gegenstand wurde bereits eine Anfrage bestätigt. Sie können trotzdem eine Anfrage stellen, falls er Ihnen gehört.
            </Alert>
          )}
          <ReturnRequestForm item={item} />
        </CardSection>
      </div>
    </div>
  )
}
