import { Backpack, Gem, IdCard, Key, Laptop, Package, Shirt, Volleyball, Wallet, type LucideIcon } from 'lucide-react'
import type { ItemCategory } from '@/domain/types'

export const CATEGORY_ICONS: Record<ItemCategory, LucideIcon> = {
  electronics: Laptop,
  clothing: Shirt,
  keys: Key,
  bags: Backpack,
  wallets: Wallet,
  id_cards: IdCard,
  jewellery: Gem,
  sports: Volleyball,
  other: Package,
}
