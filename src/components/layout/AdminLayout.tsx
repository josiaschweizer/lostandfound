import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { ClipboardList, ExternalLink, Hand, LayoutDashboard, LogOut, Mail, Package, Store, type LucideIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { t } from '@/i18n/de-CH'
import { useStaff } from '@/app/auth'
import { queryKeys } from '@/lib/queryKeys'
import { signOut } from '@/services/auth'
import { cn } from '@/components/ui/cn'
import { Logo } from './Logo'

interface NavItem {
  to: string
  label: string
  short?: string
  icon: LucideIcon
  end?: boolean
}

const MAIN: NavItem[] = [
  { to: '/verwaltung', label: t.admin.menu.overview, icon: LayoutDashboard, end: true },
  { to: '/verwaltung/funde', label: t.admin.menu.items, icon: Package },
  { to: '/verwaltung/meldungen', label: t.admin.menu.reportsLong, short: t.admin.menu.reports, icon: ClipboardList },
  { to: '/verwaltung/anfragen', label: t.admin.menu.claims, icon: Hand },
]
const MORE: NavItem[] = [
  { to: '/verwaltung/postausgang', label: t.admin.menu.outbox, icon: Mail },
  { to: '/verwaltung/fundstelle', label: t.admin.menu.office, icon: Store },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn('flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium transition', isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-700 hover:bg-stone-100')

/** Verwaltung: Seitenleiste auf Desktop, untere Leiste auf Mobile (KONZEPT 4). */
export const AdminLayout = () => {
  const { membership, organisation } = useStaff()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logout = async () => {
    await navigate('/')
    await signOut()
    queryClient.removeQueries({ queryKey: queryKeys.staff })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="truncate rounded-lg bg-stone-100 px-2.5 py-1 text-sm font-medium text-stone-800 max-sm:hidden">{organisation.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-stone-600 max-lg:hidden">
              {membership.fullName} · {t.admin.roles[membership.role]}
            </span>
            <button type="button" onClick={() => void logout()} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-stone-700 hover:bg-stone-100" aria-label={t.admin.logout}>
              <LogOut className="size-5" aria-hidden />
              <span className="max-sm:sr-only">{t.admin.logout}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4">
        <nav aria-label={t.admin.navLabel} className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 flex-col gap-1 py-6 lg:flex">
          {[...MAIN, ...MORE].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          ))}
          <Link to={`/o/${organisation.slug}`} className="mt-4 flex min-h-11 items-center gap-3 rounded-xl px-3 text-stone-700 hover:bg-stone-100">
            <ExternalLink className="size-5" aria-hidden />
            {t.admin.toPublic}
          </Link>
        </nav>
        <main className="min-w-0 flex-1 pt-6 pb-[calc(var(--bottom-nav)+var(--sticky-bar)+2rem)] lg:py-8">
          <Outlet />
        </main>
      </div>

      <nav data-bottom-nav aria-label={t.admin.navLabel} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {MAIN.map(({ to, label, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn('flex h-16 flex-col items-center justify-center gap-1 text-sm font-medium', isActive ? 'text-brand-700' : 'text-stone-600')}
          >
            <Icon className="size-6" aria-hidden />
            {short ?? label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
