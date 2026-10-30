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

export const ItemCard = ({ item, organisationName, to }: { item: FoundItem; organisationName?: string; to: string }) => (
  <Link
    to={to}
    className="group relative flex h-full flex-col rounded-2xl bg-white p-1.5 sm:rounded-3xl sm:p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-stone-200/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,59,56,0.25)] hover:ring-brand-200 focus-visible:-translate-y-0.5"
  >
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl">
      <ItemImage
        photoPath={item.photoPath}
        category={item.category}
        title={item.title}
        className="aspect-[4/3] w-full transition duration-300 group-hover:scale-[1.03]"
      />
      <span className="absolute top-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-white/85 px-2 py-0.5 text-[11px] sm:top-2.5 sm:left-2.5 sm:px-2.5 sm:py-1 font-semibold text-stone-800 shadow-sm backdrop-blur">
        {CATEGORY_LABELS[item.category]}
      </span>
      {item.status === 'reserved' && (
        <span className="absolute right-2 bottom-2 rounded-full bg-amber-400/95 px-2 py-0.5 text-[11px] sm:right-2.5 sm:bottom-2.5 sm:px-2.5 sm:py-1 font-semibold text-amber-950 shadow-sm">
          Reserviert
        </span>
      )}
    </div>
    <div className="flex flex-1 flex-col gap-2 px-1.5 pt-2.5 pb-1.5 sm:gap-3 sm:px-2.5 sm:pt-3 sm:pb-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold sm:text-base text-stone-900 group-hover:text-brand-700">{item.title}</h3>
        <ColorDot color={item.color} withLabel={false} />
      </div>
      <div className="space-y-1 text-xs text-stone-500 sm:space-y-1.5 sm:text-[13px]">
        <p className="flex items-center gap-1.5" title={`Gefunden am ${formatDate(item.foundOn)}`}>
          <Clock className="size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="max-sm:sr-only">Gefunden: </span>
            <span className="text-stone-700">{formatRelativeDay(item.foundOn)}</span>
          </span>
        </p>
        <p className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{item.foundLocation}</span>
        </p>
      </div>
      {organisationName && (
        <div className="mt-auto flex items-center gap-2 border-t border-stone-100 pt-2 sm:pt-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] max-sm:hidden font-bold text-brand-700 ring-1 ring-brand-100" aria-hidden>
            {initials(organisationName)}
          </span>
          <span className="truncate text-xs font-medium text-stone-700 sm:text-[13px]">{organisationName}</span>
        </div>
      )}
    </div>
  </Link>
)

export const ItemCardSkeleton = () => (
  <div className="rounded-2xl bg-white p-1.5 ring-1 ring-stone-200/80 sm:rounded-3xl sm:p-2" aria-hidden>
    <div className="aspect-[4/3] animate-pulse rounded-xl bg-stone-100 sm:rounded-2xl" />
    <div className="space-y-2.5 px-2.5 pt-4 pb-3">
      <div className="h-4 w-3/4 animate-pulse rounded bg-stone-100" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-stone-100" />
    </div>
  </div>
)

export const ITEM_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] sm:gap-5'
