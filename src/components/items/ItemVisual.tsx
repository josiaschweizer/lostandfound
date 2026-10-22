import { Backpack, Gem, Key, Laptop, Package, Shirt, Volleyball, Wallet, type LucideIcon } from 'lucide-react'
import { COLOR_LABELS, COLOR_SWATCHES } from '@/domain/labels'
import type { ItemCategory, ItemColor } from '@/domain/types'
import { photoUrl } from '@/services/photos'
import { cn } from '../ui/cn'

const CATEGORY_ICONS: Record<ItemCategory, LucideIcon> = {
  electronics: Laptop,
  clothing: Shirt,
  keys: Key,
  bags: Backpack,
  wallets: Wallet,
  jewellery: Gem,
  sports: Volleyball,
  other: Package,
}

const CATEGORY_TINTS: Record<ItemCategory, string> = {
  electronics: 'from-sky-100 to-sky-50 text-sky-700',
  clothing: 'from-violet-100 to-violet-50 text-violet-700',
  keys: 'from-amber-100 to-amber-50 text-amber-700',
  bags: 'from-emerald-100 to-emerald-50 text-emerald-700',
  wallets: 'from-orange-100 to-orange-50 text-orange-700',
  jewellery: 'from-pink-100 to-pink-50 text-pink-700',
  sports: 'from-lime-100 to-lime-50 text-lime-700',
  other: 'from-stone-200 to-stone-100 text-stone-600',
}

/** Foto des Gegenstands oder – ohne Foto – eine Illustration der Kategorie. */
export const ItemImage = ({ photoPath, category, title, className }: { photoPath: string | null; category: ItemCategory; title: string; className?: string }) => {
  const url = photoUrl(photoPath)
  if (url) {
    return <img src={url} alt={`Foto: ${title}`} className={cn('object-cover', className)} loading="lazy" />
  }
  const Icon = CATEGORY_ICONS[category]
  return (
    <div className={cn('flex items-center justify-center bg-linear-to-br', CATEGORY_TINTS[category], className)} aria-hidden>
      <Icon className="size-1/3 max-h-16 max-w-16" strokeWidth={1.5} />
    </div>
  )
}

export const ColorDot = ({ color, withLabel = true }: { color: ItemColor; withLabel?: boolean }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="size-3 shrink-0 rounded-full ring-1 ring-stone-300" style={{ background: COLOR_SWATCHES[color] }} aria-hidden />
    {withLabel && COLOR_LABELS[color]}
  </span>
)
