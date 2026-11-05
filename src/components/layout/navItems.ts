import { ClipboardList, HandHelping, Search, type LucideIcon } from 'lucide-react'
import { t } from '@/i18n/de-CH'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** Die drei öffentlichen Einstiege – gleich auf Desktop (Kopfzeile) und Mobile (untere Leiste). */
export const PUBLIC_NAV: NavItem[] = [
  { to: '/suche', label: t.nav.search, icon: Search },
  { to: '/verlust-melden', label: t.nav.reportLoss, icon: ClipboardList },
  { to: '/gefunden', label: t.nav.found, icon: HandHelping },
]
