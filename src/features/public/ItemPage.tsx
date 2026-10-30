import { Link, useParams } from 'react-router'
import { BackLink } from '@/components/ui/BackLink'
import { formatDate } from '@/domain/dates'
import { CATEGORY_LABELS } from '@/domain/labels'
import { ColorDot, ItemImage } from '@/components/items/ItemVisual'
import { ItemStatusBadge } from '@/components/items/StatusBadges'
import { ButtonLink } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Card, DefinitionList } from '@/components/ui/Layout'
import { Disclosure } from '@/components/ui/Disclosure'
import { usePublicItem, useOrganisationLookup } from './queries'
import { ReturnRequestForm } from './ReturnRequestForm'

const RETURN_STEPS = [
  { title: 'Anfrage senden', text: 'Mit einem Merkmal, das nur Sie kennen.' },
  { title: 'Fundstelle prüft', text: 'Vergleich mit ihren internen Angaben.' },
  { title: 'Abholen', text: 'Mit Fundnummer und Abholhinweisen.' },
]

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
    <div className="space-y-4 sm:space-y-6">
      <BackLink to="/suche" label="Zurück zur Suche" preferHistory />
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div className="space-y-4 sm:space-y-6">
          <Card className="overflow-hidden">
            <ItemImage photoPath={item.photoPath} category={item.category} title={item.title} className="aspect-4/3 w-full sm:aspect-16/10" />
            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-brand-700">{CATEGORY_LABELS[item.category]}</p>
                  <ItemStatusBadge status={item.status} />
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">{item.title}</h1>
                {item.publicDescription && <p className="mt-2 text-stone-700">{item.publicDescription}</p>}
              </div>
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
            <Disclosure title={`Fundstelle: ${org.name}`} summary={org.office.openingHours}>
              <DefinitionList
                items={[
                  { label: 'Name', value: <Link className="text-brand-700 hover:underline" to={`/o/${org.slug}`}>{org.name}</Link> },
                  { label: 'Ort', value: org.office.location },
                  { label: 'Öffnungszeiten', value: org.office.openingHours },
                  {
                    label: 'Kontakt',
                    value: (
                      <a className="break-all text-brand-700 hover:underline" href={`mailto:${org.office.contactEmail}?subject=${encodeURIComponent(`Fundnummer ${item.itemNumber}`)}`}>
                        {org.office.contactEmail}
                      </a>
                    ),
                  },
                ]}
              />
            </Disclosure>
          )}
        </div>
        <section aria-labelledby="anfrage-title">
          <Card className="p-4 sm:p-6">
            <h2 id="anfrage-title" className="text-lg font-semibold">
              Gehört dieser Gegenstand Ihnen?
            </h2>
            <ol className="my-4 grid grid-cols-3 gap-2" aria-label="So läuft die Rückgabe">
              {RETURN_STEPS.map((step, i) => (
                <li key={step.title} className="rounded-xl bg-stone-50 p-2.5 text-xs sm:p-3">
                  <span className="mb-1 flex size-6 items-center justify-center rounded-full bg-brand-600 font-semibold text-white">{i + 1}</span>
                  <span className="block font-medium text-stone-900 sm:text-sm">{step.title}</span>
                  <span className="block text-stone-600 max-sm:hidden">{step.text}</span>
                </li>
              ))}
            </ol>
            {item.status === 'reserved' && (
              <Alert tone="warning" className="mb-4">
                Bereits für eine andere Person bestätigt. Gehört er Ihnen, können Sie trotzdem anfragen.
              </Alert>
            )}
            <ReturnRequestForm item={item} />
          </Card>
        </section>
      </div>
    </div>
  )
}
