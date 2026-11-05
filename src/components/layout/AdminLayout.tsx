import { Link, Outlet } from 'react-router'
import { t } from '@/i18n/de-CH'
import { Logo } from './Logo'

/** Vorläufiger Rahmen der Verwaltung. Anmeldung, Seitenleiste und untere Leiste folgen in Etappe 7. */
export const AdminLayout = () => (
  <div className="flex min-h-dvh flex-col">
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <Link to="/verwaltung" className="flex min-h-11 items-center rounded-md bg-stone-100 px-3 text-sm font-medium text-stone-700">
          {t.admin.nav}
        </Link>
      </div>
    </header>
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:py-10">
      <Outlet />
    </main>
  </div>
)
