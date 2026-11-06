import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronRight, ClipboardList, HandHelping, Search, type LucideIcon } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { ITEM_GRID, ItemCard, ItemCardSkeleton } from '@/components/items/ItemCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { useCatalog, useOfficeMap } from './queries'
import { searchUrl } from './searchParams'

const ENTRIES: { to: string; icon: LucideIcon; title: string; text: string }[] = [
  { to: '/suche', icon: Search, ...t.home.entries.search },
  { to: '/verlust-melden', icon: ClipboardList, ...t.home.entries.report },
  { to: '/gefunden', icon: HandHelping, ...t.home.entries.found },
]

/** Startseite (KONZEPT 5.1): grosses Suchfeld, drei gleichwertige Einstiege, «Zuletzt gefunden». */
export const HomePage = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const catalog = useCatalog()
  const offices = useOfficeMap()
  const latest = (catalog.data ?? [])
    .filter((item) => item.status === 'available')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)

  return (
    <div className="space-y-8 sm:space-y-12">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">{t.home.title}</h1>
          <p className="mt-1 text-stone-700 sm:text-lg">{t.home.lead}</p>
        </div>
        <form
          role="search"
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            navigate(searchUrl({ query: query.trim() }))
          }}
        >
          <label htmlFor="home-search" className="sr-only">
            {t.home.searchLabel}
          </label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-500" aria-hidden />
            <Input
              id="home-search"
              type="search"
              enterKeyHint="search"
              className="h-14 pl-10 text-lg"
              placeholder={t.home.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="h-14 max-sm:px-4" aria-label={t.home.searchButton}>
            <Search className="size-5 sm:hidden" aria-hidden />
            <span className="max-sm:hidden">{t.home.searchButton}</span>
          </Button>
        </form>

        <ul className="grid gap-3 sm:grid-cols-3" data-testid="home-entries">
          {ENTRIES.map(({ to, icon: Icon, title, text }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex h-full items-center gap-3 rounded-2xl bg-white p-3 shadow-xs ring-1 ring-stone-200 transition hover:ring-brand-300 sm:flex-col sm:items-start sm:p-5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-stone-900 sm:text-lg">{title}</span>
                  <span className="block text-sm text-stone-600 sm:text-base">{text}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-stone-400 sm:hidden" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="latest-title">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="latest-title" className="text-xl font-semibold">
            {t.home.latest}
          </h2>
          <Link to="/suche" className="inline-flex min-h-11 items-center font-medium text-brand-700 hover:underline">
            {t.home.showAll}
          </Link>
        </div>
        {catalog.isPending ? (
          <ul className={ITEM_GRID}>
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i}>
                <ItemCardSkeleton />
              </li>
            ))}
          </ul>
        ) : latest.length === 0 ? (
          <p className="text-stone-600">{t.home.noItems}</p>
        ) : (
          <ul className={ITEM_GRID}>
            {latest.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} officeName={offices.get(item.organisationId)?.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
