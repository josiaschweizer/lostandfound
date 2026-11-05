import type { ReactNode } from 'react'
import { t } from '@/i18n/de-CH'

/** Platzhalter für Seiten, die in späteren Etappen gebaut werden. */
export const PlaceholderPage = ({ title, children }: { title: string; children?: ReactNode }) => (
  <section className="space-y-4">
    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
    <p className="text-stone-600">{t.placeholder.text}</p>
    {children}
  </section>
)
