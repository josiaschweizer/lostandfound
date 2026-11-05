import { Link, NavLink, Outlet } from 'react-router'
import { CircleHelp } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { cn } from '@/components/ui/cn'
import { Logo } from './Logo'
import { PUBLIC_NAV } from './navItems'

/**
 * Öffentlicher Rahmen: Kopfzeile mit drei Einstiegen und «Hilfe», auf Mobile eine untere Leiste
 * mit Symbol und Beschriftung (kein Hamburger-Menü, KONZEPT 4). Der Verwaltungsbereich ist nur
 * über den Footer-Link «Für Fundstellen» erreichbar.
 */
export const PublicLayout = () => (
  <div className="flex min-h-dvh flex-col">
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav aria-label={t.nav.main} className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center rounded-lg px-3 font-medium transition',
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-700 hover:bg-stone-100',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/hilfe"
          className={({ isActive }) =>
            cn(
              'flex min-h-11 items-center gap-1.5 rounded-lg px-3 font-medium transition',
              isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-700 hover:bg-stone-100',
            )
          }
        >
          <CircleHelp className="size-5" aria-hidden />
          {t.nav.help}
        </NavLink>
      </div>
    </header>

    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-8 lg:pt-10">
      <Outlet />
    </main>

    <footer className="border-t border-stone-200 bg-white pb-(--bottom-nav)">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-stone-600">
        <p>{t.footer.project}</p>
        <nav aria-label={t.nav.forOffices} className="flex flex-wrap gap-x-4">
          <Link to="/fundstellen" className="inline-flex min-h-11 items-center hover:text-stone-900 hover:underline">
            {t.nav.offices}
          </Link>
          <Link to="/hilfe" className="inline-flex min-h-11 items-center hover:text-stone-900 hover:underline">
            {t.nav.help}
          </Link>
          <Link to="/verwaltung" className="inline-flex min-h-11 items-center hover:text-stone-900 hover:underline">
            {t.nav.forOffices}
          </Link>
        </nav>
      </div>
    </footer>

    <nav
      data-bottom-nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {PUBLIC_NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex h-16 flex-col items-center justify-center gap-1 text-sm font-medium transition',
              isActive ? 'text-brand-700' : 'text-stone-600 hover:text-stone-900',
            )
          }
        >
          <Icon className="size-6" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  </div>
)
