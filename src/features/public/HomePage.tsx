import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Building2, ChevronRight, ClipboardList, HandHelping, MessageCircle, Search, ShieldCheck } from 'lucide-react'
import { ORGANISATION_TYPE_LABELS } from '@/domain/labels'
import { useDock } from '@/app/dock'
import { useAuth } from '@/app/useAuth'
import { ItemCard } from '@/components/items/ItemCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { Card } from '@/components/ui/Layout'
import { useCatalog, useOrganisationLookup, useOrganisations } from './queries'
import { searchUrl } from './useCatalogFilters'

export const HomePage = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { membership } = useAuth()
  const { setOpenPanel } = useDock()
  const organisations = useOrganisations()
  const catalog = useCatalog()
  const lookup = useOrganisationLookup()
  const latest = (catalog.data ?? []).slice(0, 4)

  return (
    <div className="space-y-10 sm:space-y-14">
      <section className="relative overflow-hidden rounded-3xl bg-brand-900 px-5 py-8 text-white sm:px-12 sm:py-14">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-brand-700/50 blur-3xl" aria-hidden />
        <div className="relative max-w-2xl">
          <h1 className="text-[1.7rem] leading-tight font-semibold tracking-tight sm:text-5xl">Verloren? Vielleicht schon gefunden.</h1>
          <p className="mt-3 text-brand-100 sm:mt-4 sm:text-lg">Alle Fundstellen von Schulen, Fundbüros und Unternehmen – an einem Ort und ohne Anmeldung.</p>
          <form
            role="search"
            className="mt-6 flex gap-2 sm:mt-8"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(searchUrl({ query: query.trim() }))
            }}
          >
            <label htmlFor="home-search" className="sr-only">
              Suchbegriff
            </label>
            <Input id="home-search" type="search" placeholder="z. B. Rucksack" className="h-12 min-w-0 flex-1 sm:text-base!" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button type="submit" size="lg" className="bg-white text-brand-800! hover:bg-brand-50" icon={<Search className="size-5" />}>
              Suchen
            </Button>
          </form>
        </div>
      </section>

      <section aria-labelledby="actions-title">
        <h2 id="actions-title" className="mb-3 text-lg font-semibold sm:text-xl">
          Was möchten Sie tun?
        </h2>
        <Card className="divide-y divide-stone-100 overflow-hidden lg:grid lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          <ActionRow icon={<ClipboardList />} title="Verlust melden" text="Beschreiben, was fehlt – wir zeigen passende Funde." to="/verlust-melden" />
          <ActionRow icon={<MessageCircle />} title="Assistent fragen" text="In eigenen Worten erzählen – der Assistent sucht mit." onClick={() => setOpenPanel('assistant')} />
          {membership ? (
            <ActionRow icon={<HandHelping />} title="Fund erfassen" text="Neuen Fund für Ihre Fundstelle aufnehmen." to="/verwaltung/neu" />
          ) : (
            <>
              <ActionRow
                icon={<HandHelping />}
                title="Etwas gefunden?"
                text="Bei einer Fundstelle abgeben. Mitarbeitende erfassen den Fund nach dem Anmelden."
                to="/anmelden"
                state={{ from: '/verwaltung/neu' }}
              />
              <ActionRow icon={<Building2 />} title="Organisation registrieren" text="Eigene Fundstelle einrichten – kostenlos." to="/registrieren" />
            </>
          )}
        </Card>
      </section>

      {latest.length > 0 && (
        <section aria-labelledby="latest-title">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="latest-title" className="text-lg font-semibold sm:text-xl">
              Neu gefunden
            </h2>
            <Link to="/suche" className="text-sm font-medium text-brand-700 hover:underline">
              Alle anzeigen
            </Link>
          </div>
          <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] sm:gap-5 sm:overflow-visible sm:px-0">
            {latest.map((item) => (
              <li key={item.id} className="w-40 shrink-0 snap-start sm:w-auto">
                <ItemCard item={item} to={`/fund/${item.id}`} organisationName={lookup.get(item.organisationId)?.name} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="orgs-title">
        <h2 id="orgs-title" className="text-lg font-semibold sm:text-xl">
          Fundstellen
        </h2>
        <p className="mb-3 text-sm text-stone-600">Sie wissen, wo Sie etwas verloren haben? Suchen Sie direkt dort.</p>
        <Card className="divide-y divide-stone-100 overflow-hidden">
          {(organisations.data ?? []).map((org) => (
            <Link key={org.id} to={`/o/${org.slug}`} className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-stone-50">
              <span className="min-w-0">
                <span className="block truncate font-medium">{org.name}</span>
                <span className="block truncate text-sm text-stone-500">
                  {ORGANISATION_TYPE_LABELS[org.type]} · {org.address}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-stone-400" aria-hidden />
            </Link>
          ))}
        </Card>
        <p className="mt-4 flex gap-2 text-sm text-stone-500">
          <ShieldCheck className="size-4 shrink-0 translate-y-0.5 text-brand-600" aria-hidden />
          Öffentlich sichtbar sind nur allgemeine Angaben. Besondere Merkmale bleiben bei der Fundstelle – so lässt sich prüfen, wem etwas gehört.
        </p>
      </section>
    </div>
  )
}

interface ActionRowProps {
  icon: ReactNode
  title: string
  text: string
  to?: string
  state?: unknown
  onClick?: () => void
}

const ActionRow = ({ icon, title, text, to, state, onClick }: ActionRowProps) => {
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 [&_svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-stone-900">{title}</span>
        <span className="block text-sm text-stone-600">{text}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-stone-400 lg:hidden" aria-hidden />
    </>
  )
  const className = 'flex w-full items-center gap-3 p-4 text-left transition hover:bg-stone-50 lg:flex-col lg:items-start lg:p-5'
  return to ? (
    <Link to={to} state={state} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}
