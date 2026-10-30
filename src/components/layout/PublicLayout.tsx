import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { ClipboardList, Inbox, Menu, Search, X } from 'lucide-react'
import { useAuth } from '@/app/useAuth'
import { useSavedLinks } from '@/app/useSavedLinks'
import { AssistantWidget } from '@/features/assistant/AssistantWidget'
import { ButtonLink } from '../ui/Button'
import type { ButtonSize } from '../ui/buttonClasses'
import { cn } from '../ui/cn'
import { Logo } from './Logo'

const NAV_ITEMS = [
  { to: '/suche', label: 'Gegenstand suchen', icon: Search },
  { to: '/verlust-melden', label: 'Verlust melden', icon: ClipboardList },
]

export const PublicLayout = () => {
  const { membership } = useAuth()
  const savedLinks = useSavedLinks()
  const { pathname } = useLocation()
  const [menu, setMenu] = useState({ open: false, path: pathname })
  // Menü schliesst sich bei jedem Seitenwechsel von selbst.
  const menuOpen = menu.open && menu.path === pathname
  const toggleMenu = () => setMenu({ open: !menuOpen, path: pathname })

  const navItems = [
    ...NAV_ITEMS,
    ...(savedLinks.length > 0 ? [{ to: '/meine-anfragen', label: 'Meine Anfragen', icon: Inbox, count: savedLinks.length }] : []),
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Hauptnavigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn('rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:text-stone-900')
                }
              >
                {item.label}
                {'count' in item && <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 text-xs text-white">{item.count}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <OrganisationActions isStaff={Boolean(membership)} />
          </div>

          <button
            type="button"
            className="-mr-2 rounded-lg p-2 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Menü schliessen' : 'Menü öffnen'}
            onClick={toggleMenu}
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="border-t border-stone-200 bg-white px-4 pt-2 pb-4 shadow-lg lg:hidden">
            <nav aria-label="Hauptnavigation mobil">
              <ul className="divide-y divide-stone-100">
                {navItems.map(({ to, label, icon: Icon, ...rest }) => (
                  <li key={to}>
                    <NavLink to={to} className={({ isActive }) => cn('flex items-center gap-3 py-3.5 text-base font-medium', isActive && 'text-brand-700')}>
                      <Icon className="size-5 text-stone-400" aria-hidden />
                      <span className="flex-1">{label}</span>
                      {'count' in rest && <span className="rounded-full bg-brand-600 px-2 text-xs text-white">{rest.count}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="mt-4 mb-2 text-xs font-medium text-stone-500 uppercase">Für Fundstellen</p>
            <div className="flex flex-col gap-2">
              <OrganisationActions isStaff={Boolean(membership)} size="md" />
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>

      {/* Unten Platz lassen für den Assistenten-Knopf in der Ecke */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-24 text-sm text-stone-500 sm:pb-6">
          Schulprototyp (Modul M241) · Beispieldaten sind erfunden · Bitte keine echten Personendaten eingeben.
        </div>
      </footer>
      <AssistantWidget />
    </div>
  )
}

const OrganisationActions = ({ isStaff, size = 'sm' }: { isStaff: boolean; size?: ButtonSize }) =>
  isStaff ? (
    <ButtonLink to="/verwaltung" size={size}>
      Zur Verwaltung
    </ButtonLink>
  ) : (
    <>
      <ButtonLink to="/anmelden" variant="secondary" size={size}>
        Anmelden
      </ButtonLink>
      <ButtonLink to="/registrieren" size={size}>
        Organisation registrieren
      </ButtonLink>
    </>
  )
