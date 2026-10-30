import { useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ClipboardList, ExternalLink, Inbox, LogOut, Mail, MoreHorizontal, Package, PackagePlus, Store } from 'lucide-react'
import { useStaffContext } from '@/app/useAuth'
import { useStaffTodo } from '@/features/admin/queries'
import { signOut } from '@/services/auth'
import { buttonClasses } from '../ui/buttonClasses'
import { cn } from '../ui/cn'
import { Sheet } from '../ui/Sheet'
import { Logo } from './Logo'

interface NavItem {
  to: string
  label: string
  shortLabel?: string
  icon: ComponentType<{ className?: string }>
  count?: number
  end?: boolean
}

export const AdminLayout = () => {
  const { organisation, membership } = useStaffContext()
  const todo = useStaffTodo()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [moreOpen, setMoreOpen] = useState(false)

  const logout = async () => {
    await navigate('/')
    await signOut()
    queryClient.removeQueries({ queryKey: ['staff'] })
  }

  const itemsNav: NavItem = { to: '/verwaltung', label: 'Gegenstände', icon: Package, end: true }
  const requestsNav: NavItem = { to: '/verwaltung/anfragen', label: 'Anfragen', icon: Inbox, count: todo.openRequests }
  const reportsNav: NavItem = { to: '/verwaltung/meldungen', label: 'Verlustmeldungen', shortLabel: 'Meldungen', icon: ClipboardList, count: todo.reportsWithMatches }
  const moreItems: NavItem[] = [
    { to: '/verwaltung/fundstelle', label: 'Fundstelle', icon: Store },
    { to: `/o/${organisation.slug}`, label: 'Öffentliche Seite', icon: ExternalLink },
    { to: '/verwaltung/postausgang', label: 'Gesendete Nachrichten', icon: Mail },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="truncate rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">{organisation.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/verwaltung/neu" className={cn(buttonClasses('primary', 'sm'), 'max-lg:hidden')}>
              <PackagePlus className="size-4" aria-hidden /> Fundgegenstand erfassen
            </Link>
            <span className="text-sm text-stone-600 max-lg:hidden">{membership.fullName}</span>
            <button type="button" onClick={logout} className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 max-lg:hidden" aria-label="Abmelden" title="Abmelden">
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2 max-lg:hidden" aria-label="Verwaltung">
          {[itemsNav, requestsNav, reportsNav, ...moreItems].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition',
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                )
              }
            >
              <item.icon className="size-4" /> {item.label}
              {item.count ? <CountBadge count={item.count} /> : null}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-[calc(var(--bottom-nav)+1.5rem)] lg:py-8">
        <Outlet />
      </main>

      <nav
        data-bottom-nav
        aria-label="Verwaltung"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <BottomNavLink item={itemsNav} />
        <BottomNavLink item={requestsNav} />
        <NavLink to="/verwaltung/neu" className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-brand-700">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-white shadow">
            <PackagePlus className="size-5" aria-hidden />
          </span>
          Erfassen
        </NavLink>
        <BottomNavLink item={reportsNav} />
        <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-stone-500">
          <MoreHorizontal className="size-5" aria-hidden />
          Mehr
        </button>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={organisation.name}>
        <ul className="-mx-2">
          {moreItems.map((item) => (
            <li key={item.to}>
              <Link to={item.to} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-3.5 text-base font-medium hover:bg-stone-50">
                <item.icon className="size-5 text-stone-400" /> {item.label}
              </Link>
            </li>
          ))}
          <li className="mt-2 border-t border-stone-100 pt-2">
            <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-2 py-3.5 text-base font-medium text-red-700 hover:bg-red-50">
              <LogOut className="size-5" /> Abmelden
              <span className="ml-auto text-sm font-normal text-stone-500">{membership.fullName}</span>
            </button>
          </li>
        </ul>
      </Sheet>
    </div>
  )
}

const CountBadge = ({ count }: { count: number }) => <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{count}</span>

const BottomNavLink = ({ item }: { item: NavItem }) => (
  <NavLink
    to={item.to}
    end={item.end}
    className={({ isActive }) => cn('relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-brand-700' : 'text-stone-500')}
  >
    <span className="relative">
      <item.icon className="size-5" />
      {item.count ? <span className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-brand-600 px-1 text-center text-[10px] leading-4 text-white">{item.count}</span> : null}
    </span>
    {item.shortLabel ?? item.label}
  </NavLink>
)
