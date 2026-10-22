import { NavLink, Outlet, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ClipboardList, ExternalLink, Inbox, LogOut, Mail, Package, PackagePlus, Store } from 'lucide-react'
import { useStaffContext } from '@/app/useAuth'
import { useRequests } from '@/features/admin/queries'
import { signOut } from '@/services/auth'
import { ButtonLink } from '../ui/Button'
import { cn } from '../ui/cn'
import { Logo } from './Logo'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition',
    isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
  )

export const AdminLayout = () => {
  const { organisation, membership } = useStaffContext()
  const requests = useRequests()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const openCount = (requests.data ?? []).filter((r) => r.status === 'open').length

  const logout = async () => {
    await navigate('/')
    await signOut()
    queryClient.removeQueries({ queryKey: ['staff'] })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="hidden truncate rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700 sm:inline">
              Verwaltung · {organisation.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ButtonLink to="/verwaltung/neu" size="sm" icon={<PackagePlus className="size-4" />} className="hidden sm:inline-flex">
              Fundgegenstand erfassen
            </ButtonLink>
            <span className="hidden text-sm text-stone-600 lg:inline">{membership.fullName}</span>
            <button type="button" onClick={logout} className="rounded-lg p-2 text-stone-600 hover:bg-stone-100" aria-label="Abmelden" title="Abmelden">
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Verwaltung">
          <NavLink to="/verwaltung" end className={navClass}>
            <Package className="size-4" aria-hidden /> Gegenstände
          </NavLink>
          <NavLink to="/verwaltung/anfragen" className={navClass}>
            <Inbox className="size-4" aria-hidden /> Anfragen
            {openCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{openCount}</span>}
          </NavLink>
          <NavLink to="/verwaltung/meldungen" className={navClass}>
            <ClipboardList className="size-4" aria-hidden /> Verlustmeldungen
          </NavLink>
          <NavLink to="/verwaltung/postausgang" className={navClass}>
            <Mail className="size-4" aria-hidden /> Postausgang
          </NavLink>
          <NavLink to="/verwaltung/fundstelle" className={navClass}>
            <Store className="size-4" aria-hidden /> Fundstelle
          </NavLink>
          <NavLink to={`/o/${organisation.slug}`} className={navClass}>
            <ExternalLink className="size-4" aria-hidden /> Öffentliche Seite
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <ButtonLink to="/verwaltung/neu" className="fixed bottom-4 left-4 z-40 shadow-lg sm:hidden" icon={<PackagePlus className="size-4" />}>
        Erfassen
      </ButtonLink>
    </div>
  )
}
