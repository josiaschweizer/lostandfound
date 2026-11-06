import { useState } from 'react'
import { Info, MapPinned } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { OfficeInfo } from '@/components/items/OfficeInfo'
import { ErrorState, Spinner } from '@/components/ui/Feedback'
import { Card, PageHeader } from '@/components/ui/Layout'
import { cn } from '@/components/ui/cn'
import { useOffices } from './queries'

const ELSEWHERE = 'elsewhere'

/** «Ich habe etwas gefunden» (KONZEPT 5.6): ohne Login, Abgabeort in höchstens 2 Klicks. */
export const FoundPage = () => {
  const offices = useOffices()
  const [selected, setSelected] = useState<string | null>(null)
  const office = offices.data?.find((o) => o.id === selected)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={t.found.title} lead={t.found.lead} />
      <section aria-labelledby="where" className="space-y-3">
        <h2 id="where" className="text-lg font-semibold">
          {t.found.where}
        </h2>
        {offices.isPending && <Spinner />}
        {offices.isError && <ErrorState error={offices.error} onRetry={() => offices.refetch()} />}
        <ul className="grid gap-2 sm:grid-cols-2">
          {[...(offices.data ?? []).map((o) => ({ id: o.id, label: o.name, sub: o.address })), { id: ELSEWHERE, label: t.found.elsewhere, sub: '' }].map((option) => (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={selected === option.id}
                onClick={() => setSelected(option.id)}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition',
                  selected === option.id ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-stone-200 hover:ring-brand-300',
                )}
              >
                <MapPinned className="size-5 shrink-0 text-brand-700" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-semibold">{option.label}</span>
                  {option.sub && <span className="block truncate text-sm text-stone-600">{option.sub}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div aria-live="polite">
        {office && (
          <Card className="p-4 sm:p-6" data-testid="drop-off-info">
            <OfficeInfo office={office} />
          </Card>
        )}
        {selected === ELSEWHERE && (
          <Card className="space-y-2 p-4 sm:p-6" data-testid="drop-off-info">
            <h2 className="text-lg font-semibold">{t.found.elsewhereTitle}</h2>
            {t.found.elsewhereText.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </Card>
        )}
      </div>

      <p className="flex gap-2 text-stone-700">
        <Info className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
        {t.found.noLogin}
      </p>
    </div>
  )
}
