import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/app/useAuth'
import { ButtonLink } from '../ui/Button'
import { cn } from '../ui/cn'
import { Logo } from './Logo'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:text-stone-900')

export const PublicLayout = () => {
  const { membership } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const links = (
    <>
      <NavLink to="/suche" className={navClass} onClick={() => setMenuOpen(false)}>
        Gegenstand suchen
      </NavLink>
      <NavLink to="/verlust-melden" className={navClass} onClick={() => setMenuOpen(false)}>
        Verlust melden
      </NavLink>
    </>
  )
  const orgActions = membership ? (
    <ButtonLink to="/verwaltung" size="sm">
      Zur Verwaltung
    </ButtonLink>
  ) : (
    <>
      <ButtonLink to="/anmelden" variant="ghost" size="sm">
        Anmelden
      </ButtonLink>
      <ButtonLink to="/registrieren" size="sm">
        Organisation registrieren
      </ButtonLink>
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Hauptnavigation">
            {links}
          </nav>
          <div className="hidden items-center gap-2 md:flex">{orgActions}</div>
          <button type="button" className="rounded-lg p-2 md:hidden" aria-expanded={menuOpen} aria-label="Menü" onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-stone-200 px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1" aria-label="Hauptnavigation mobil">
              {links}
            </nav>
            <div className="mt-2 flex flex-wrap gap-2" onClick={() => setMenuOpen(false)}>
              {orgActions}
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-stone-500">
          Schulprototyp (Modul M241) · Alle Daten sind erfunden · E-Mails werden nur simuliert.
        </div>
      </footer>
    </div>
  )
}
