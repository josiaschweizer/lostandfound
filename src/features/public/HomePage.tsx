import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, Building2, ClipboardList, PackagePlus, Search, ShieldCheck } from 'lucide-react'
import { ORGANISATION_TYPE_LABELS } from '@/domain/labels'
import { useAuth } from '@/app/useAuth'
import { ITEM_GRID, ItemCard } from '@/components/items/ItemCard'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { Card } from '@/components/ui/Layout'
import { useCatalog, useOrganisationLookup, useOrganisations } from './queries'
import { searchUrl } from './useCatalogFilters'

export const HomePage = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { membership } = useAuth()
  const organisations = useOrganisations()
  const catalog = useCatalog()
  const lookup = useOrganisationLookup()
  const latest = (catalog.data ?? []).slice(0, 4)

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-brand-900 px-6 py-12 text-white sm:px-12 sm:py-16">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-brand-700/50 blur-3xl" aria-hidden />
        <div className="relative max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Verloren? Vielleicht schon gefunden.</h1>
          <p className="mt-4 text-lg text-brand-100">
            Durchsuchen Sie die Fundstellen von Schulen, Fundbüros und Unternehmen – an einem Ort und ohne Anmeldung.
          </p>
          <form
            role="search"
            className="mt-8 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(searchUrl({ query: query.trim() }))
            }}
          >
            <label htmlFor="home-search" className="sr-only">
              Suchbegriff
            </label>
            <Input
              id="home-search"
              type="search"
              placeholder="z. B. Rucksack, Kopfhörer, Schlüssel"
              className="h-12 text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" size="lg" className="bg-white text-brand-800! hover:bg-brand-50" icon={<Search className="size-5" />}>
              Gegenstand suchen
            </Button>
          </form>
          <p className="mt-4 text-sm text-brand-100">
            Nichts gefunden?{' '}
            <Link to="/verlust-melden" className="font-medium text-white underline underline-offset-2">
              Verlust melden
            </Link>{' '}
            – wir zeigen passende Funde automatisch.
          </p>
        </div>
      </section>

      <section aria-labelledby="actions-title" className="grid gap-4 md:grid-cols-3">
        <h2 id="actions-title" className="sr-only">
          Häufige Aktionen
        </h2>
        <ActionCard icon={<Search />} title="Gegenstand suchen" text="In allen Fundstellen oder gezielt bei einer Organisation suchen." to="/suche" cta="Zur Suche" />
        <ActionCard icon={<ClipboardList />} title="Verlust melden" text="Beschreiben, was fehlt – mögliche Treffer erscheinen sofort." to="/verlust-melden" cta="Meldung erfassen" />
        {membership ? (
          <ActionCard icon={<PackagePlus />} title="Fundgegenstand erfassen" text="Neuen Fund für Ihre Fundstelle aufnehmen." to="/verwaltung/neu" cta="Erfassen" highlight />
        ) : (
          <ActionCard icon={<Building2 />} title="Organisation registrieren" text="Eigene Fundstelle einrichten und Funde online verwalten." to="/registrieren" cta="Kostenlos registrieren" highlight />
        )}
      </section>

      {latest.length > 0 && (
        <section aria-labelledby="latest-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 id="latest-title" className="text-xl font-semibold">
              Neu gefunden
            </h2>
            <Link to="/suche" className="text-sm font-medium text-brand-700 hover:underline">
              Alle anzeigen
            </Link>
          </div>
          <ul className={ITEM_GRID}>
            {latest.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} to={`/fund/${item.id}`} organisationName={lookup.get(item.organisationId)?.name} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="orgs-title">
        <h2 id="orgs-title" className="mb-1 text-xl font-semibold">
          Fundstellen
        </h2>
        <p className="mb-4 text-stone-600">Sie wissen, wo Sie etwas verloren haben? Suchen Sie direkt bei dieser Organisation.</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(organisations.data ?? []).map((org) => (
            <li key={org.id}>
              <Link to={`/o/${org.slug}`} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-stone-200 transition hover:ring-brand-300">
                <div className="min-w-0">
                  <p className="truncate font-medium">{org.name}</p>
                  <p className="text-sm text-stone-500">
                    {ORGANISATION_TYPE_LABELS[org.type]} · {org.address}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-stone-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-start gap-3 rounded-2xl bg-white p-5 text-sm text-stone-600 ring-1 ring-stone-200">
        <ShieldCheck className="size-5 shrink-0 text-brand-600" aria-hidden />
        <p>
          Öffentlich sichtbar sind nur allgemeine Angaben. Besondere Merkmale bleiben bei der Fundstelle – so lässt sich bei einer Anfrage prüfen, wem
          ein Gegenstand wirklich gehört.
        </p>
      </section>
    </div>
  )
}

const ActionCard = ({ icon, title, text, to, cta, highlight }: { icon: ReactNode; title: string; text: string; to: string; cta: string; highlight?: boolean }) => (
  <Card className="flex flex-col p-6">
    <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 [&_svg]:size-5">{icon}</div>
    <h3 className="font-semibold">{title}</h3>
    <p className="mt-1 mb-5 flex-1 text-sm text-stone-600">{text}</p>
    <ButtonLink to={to} variant={highlight ? 'primary' : 'secondary'} className="self-start">
      {cta}
    </ButtonLink>
  </Card>
)
