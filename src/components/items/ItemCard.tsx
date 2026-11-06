import { Link } from 'react-router'
import { Clock, MapPin } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { daysBetween, formatDate, todayIso } from '@/domain/dates'
import type { ItemCategory, ItemColor, ItemStatus } from '@/domain/types'
import { ColorLabels } from './ColorDot'
import { ItemImage } from './ItemImage'
import { ReasonChips } from './ReasonChips'

export interface CardItem {
  itemNumber: string
  title: string
  category: ItemCategory
  colors: ItemColor[]
  foundOn: string
  foundLocation: string
  photoPath: string | null
  status: ItemStatus
}

/** Fundkarte (KONZEPT 5.2): Titel max. 2 Zeilen, Farbe mit Namen, Ort, Datum relativ, Fundstelle. */
export const ItemCard = ({
  item,
  officeName,
  reasons,
  badge,
  target,
}: {
  item: CardItem
  officeName?: string
  reasons?: string[]
  badge?: React.ReactNode
  target?: '_blank'
}) => (
  <Link
    to={`/fund/${item.itemNumber}`}
    target={target}
    rel={target ? 'noopener' : undefined}
    className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-xs ring-1 ring-stone-200/80 transition hover:shadow-md hover:ring-stone-300"
  >
    <div className="relative">
      <ItemImage photoPath={item.photoPath} category={item.category} title={item.title} className="aspect-[4/3] w-full" />
      <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-0.5 text-sm font-medium text-stone-800 shadow-xs">
        {t.labels.categories[item.category]}
      </span>
    </div>
    <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
      <h3 className="line-clamp-2 text-base leading-snug font-semibold text-stone-900 group-hover:text-brand-700" title={item.title}>
        {item.title}
      </h3>
      {item.status === 'reserved' && <span className="self-start rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-900">{t.item.reservedHint}</span>}
      {badge}
      <ColorLabels colors={item.colors} className="text-sm text-stone-700" />
      <p className="flex items-center gap-1.5 text-sm text-stone-700">
        <MapPin className="size-4 shrink-0 text-stone-500" aria-hidden />
        <span className="truncate">{item.foundLocation}</span>
      </p>
      <p className="flex items-center gap-1.5 text-sm text-stone-700" title={formatDate(item.foundOn)}>
        <Clock className="size-4 shrink-0 text-stone-500" aria-hidden />
        <span>
          {t.common.foundOn} {t.common.relativeDays(daysBetween(item.foundOn, todayIso()))}
        </span>
      </p>
      {reasons && reasons.length > 0 && <ReasonChips reasons={reasons} />}
      {officeName && <p className="mt-auto truncate border-t border-stone-100 pt-2 text-sm font-medium text-stone-800">{officeName}</p>}
    </div>
  </Link>
)

export const ItemCardSkeleton = () => (
  <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200/80" aria-hidden>
    <div className="aspect-[4/3] animate-pulse bg-stone-100" />
    <div className="space-y-2 p-4">
      <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-stone-100" />
    </div>
  </div>
)

export const ITEM_GRID = 'grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
