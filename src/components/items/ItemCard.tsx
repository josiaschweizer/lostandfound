import { Clock, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { formatDate, formatRelativeDay } from '@/domain/dates'
import { CATEGORY_LABELS } from '@/domain/labels'
import type { FoundItem } from '@/domain/types'
import { ColorDot, ItemImage } from './ItemVisual'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-ZÄÖÜ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

/** Öffentliche Ergebniskarte: Bild, Titel, Funddatum, Organisation. */
export const ItemCard = ({ item, organisationName, to }: { item: FoundItem; organisationName?: string; to: string }) => (
  <Link
    to={to}
    className="group flex h-full flex-col rounded-3xl bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-stone-200/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,59,56,0.25)] hover:ring-brand-200 focus-visible:-translate-y-0.5"
  >
    <div className="relative overflow-hidden rounded-2xl">
      <ItemImage
        photoPath={item.photoPath}
        category={item.category}
        title={item.title}
        className="aspect-[4/3] w-full transition duration-300 group-hover:scale-[1.03]"
      />
      <span className="absolute top-2.5 left-2.5 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-stone-800 shadow-sm backdrop-blur">
        {CATEGORY_LABELS[item.category]}
      </span>
      {item.status === 'reserved' && (
        <span className="absolute top-2.5 right-2.5 rounded-full bg-amber-400/95 px-2.5 py-1 text-[11px] font-semibold text-amber-950 shadow-sm">
          Reserviert
        </span>
      )}
    </div>
    <div className="flex flex-1 flex-col gap-3 px-2.5 pt-3 pb-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 leading-snug font-semibold text-stone-900 group-hover:text-brand-700">{item.title}</h3>
        <ColorDot color={item.color} withLabel={false} />
      </div>
      <div className="space-y-1.5 text-[13px] text-stone-500">
        <p className="flex items-center gap-1.5" title={`Gefunden am ${formatDate(item.foundOn)}`}>
          <Clock className="size-3.5 shrink-0" aria-hidden />
          <span>
            Gefunden: <span className="text-stone-700">{formatRelativeDay(item.foundOn)}</span>
          </span>
        </p>
        <p className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{item.foundLocation}</span>
        </p>
      </div>
      {organisationName && (
        <div className="mt-auto flex items-center gap-2 border-t border-stone-100 pt-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700 ring-1 ring-brand-100" aria-hidden>
            {initials(organisationName)}
          </span>
          <span className="truncate text-[13px] font-medium text-stone-700">{organisationName}</span>
        </div>
      )}
    </div>
  </Link>
)

export const ItemCardSkeleton = () => (
  <div className="rounded-3xl bg-white p-2 ring-1 ring-stone-200/80" aria-hidden>
    <div className="aspect-[4/3] animate-pulse rounded-2xl bg-stone-100" />
    <div className="space-y-2.5 px-2.5 pt-4 pb-3">
      <div className="h-4 w-3/4 animate-pulse rounded bg-stone-100" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-stone-100" />
    </div>
  </div>
)

/** Responsives Raster: so viele Spalten wie Platz, Karten mindestens 15 rem breit. */
export const ITEM_GRID = 'grid gap-4 sm:gap-5 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]'
