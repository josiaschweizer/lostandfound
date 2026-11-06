import { Link } from 'react-router'
import { t } from '@/i18n/de-CH'

export const Logo = () => (
  <Link to="/" className="flex min-h-11 items-center gap-2 text-lg font-semibold tracking-tight text-stone-900">
    <img src="/favicon.svg" alt="" className="size-8" />
    {t.app.name}
    <span className="sr-only"> – {t.nav.home}</span>
  </Link>
)
