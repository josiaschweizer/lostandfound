import type { ItemCategory } from '@/domain/types'
import { photoUrl } from '@/services/photos'
import { t } from '@/i18n/de-CH'
import { cn } from '@/components/ui/cn'
import { CATEGORY_ICONS } from './categoryIcons'


const TINTS: Record<ItemCategory, string> = {
  electronics: 'from-sky-100 to-sky-50 text-sky-700',
  clothing: 'from-violet-100 to-violet-50 text-violet-700',
  keys: 'from-amber-100 to-amber-50 text-amber-700',
  bags: 'from-emerald-100 to-emerald-50 text-emerald-700',
  wallets: 'from-orange-100 to-orange-50 text-orange-700',
  id_cards: 'from-indigo-100 to-indigo-50 text-indigo-700',
  jewellery: 'from-pink-100 to-pink-50 text-pink-700',
  sports: 'from-lime-100 to-lime-50 text-lime-700',
  other: 'from-stone-200 to-stone-100 text-stone-600',
}

/** Foto oder – ohne Foto – eine Illustration der Kategorie. */
export const ItemImage = ({ photoPath, category, title, className }: { photoPath: string | null; category: ItemCategory; title: string; className?: string }) => {
  const url = photoUrl(photoPath)
  if (url) return <img src={url} alt={t.item.photoAlt(title)} className={cn('object-cover', className)} loading="lazy" />
  const Icon = CATEGORY_ICONS[category]
  return (
    <div className={cn('flex items-center justify-center bg-linear-to-br', TINTS[category], className)} aria-hidden>
      <Icon className="size-1/3 max-h-16 max-w-16" strokeWidth={1.5} />
    </div>
  )
}
