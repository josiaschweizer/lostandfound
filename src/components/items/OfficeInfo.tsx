import { Link } from 'react-router'
import { Clock, MapPin, ShieldCheck, Store } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import type { Organisation } from '@/domain/types'
import { cn } from '@/components/ui/cn'

/** Abgabe-/Abholort, Öffnungszeiten und Abholregeln – immer sichtbar, nie zugeklappt (T8). */
export const OfficeInfo = ({ office, title, linkName = true, className }: { office: Organisation; title?: string; linkName?: boolean; className?: string }) => (
  <div className={cn('space-y-3', className)}>
    {title && <h2 className="text-lg font-semibold text-stone-900">{title}</h2>}
    <p className="flex gap-3">
      <Store className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
      <span>
        {linkName ? (
          <Link to={`/o/${office.slug}`} className="font-semibold text-brand-800 underline-offset-2 hover:underline">
            {office.name}
          </Link>
        ) : (
          <span className="font-semibold">{office.name}</span>
        )}
        <span className="block text-stone-700">{office.address}</span>
      </span>
    </p>
    <p className="flex gap-3">
      <MapPin className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
      <span>
        <span className="block text-sm text-stone-600">{t.office.dropOff}</span>
        <span className="font-medium">{office.dropOffLocation}</span>
      </span>
    </p>
    <p className="flex gap-3">
      <Clock className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
      <span>
        <span className="block text-sm text-stone-600">{t.office.hours}</span>
        <span className="font-medium">{office.openingHours}</span>
      </span>
    </p>
    {office.pickupRules && (
      <p className="flex gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
        <span>
          <span className="block text-sm text-stone-600">{t.office.rules}</span>
          <span>{office.pickupRules}</span>
        </span>
      </p>
    )}
  </div>
)
