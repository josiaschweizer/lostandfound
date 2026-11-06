import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ChevronRight, ClipboardList, Hand, Mail, Package, PackagePlus, RotateCcw, Store } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { useStaff } from '@/app/auth'
import { resetDemo } from '@/services/staff'
import { toUserMessage } from '@/services/errors'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Card, PageHeader, Section } from '@/components/ui/Layout'
import { cn } from '@/components/ui/cn'
import { useToast } from '@/components/ui/toastContext'
import { useClaims, useMatchCounts, useStaffItems } from './queries'
import { useInvalidate } from './useInvalidate'

/** Übersicht mit Kennzahlen und grossem Button «Fund erfassen» (KONZEPT 4). */
export const OverviewPage = () => {
  const { organisation, isAdmin } = useStaff()
  const items = useStaffItems()
  const claims = useClaims()
  const counts = useMatchCounts()
  const invalidate = useInvalidate()
  const toast = useToast()
  const [confirmReset, setConfirmReset] = useState(false)
  const reset = useMutation({
    mutationFn: resetDemo,
    onSuccess: async () => {
      setConfirmReset(false)
      await invalidate()
      toast({ message: t.admin.overview.demoDone })
    },
  })

  const kpis = [
    { label: t.admin.overview.openItems, value: (items.data ?? []).filter((i) => i.status === 'available').length, to: '/verwaltung/funde', icon: Package },
    { label: t.admin.overview.openClaims, value: (claims.data ?? []).filter((c) => c.status === 'open').length, to: '/verwaltung/anfragen', icon: Hand },
    { label: t.admin.overview.reportsWithMatches, value: Object.keys(counts.data?.reports ?? {}).length, to: '/verwaltung/meldungen?treffer=1', icon: ClipboardList },
  ]
  const loading = items.isPending || claims.isPending || counts.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.admin.overview.title}
        lead={organisation.name}
        actions={
          <ButtonLink to="/verwaltung/funde/neu" size="lg" icon={<PackagePlus className="size-5" aria-hidden />}>
            {t.admin.overview.newItem}
          </ButtonLink>
        }
      />

      <ul className="grid gap-3 sm:grid-cols-3" aria-busy={loading}>
        {kpis.map(({ label, value, to, icon: Icon }) => (
          <li key={label}>
            <Link to={to} className={cn('flex items-center gap-4 rounded-3xl p-4 ring-1 transition sm:p-5', value > 0 ? 'bg-brand-600 text-white ring-brand-600 hover:bg-brand-700' : 'bg-white ring-stone-200 hover:ring-stone-300')}>
              <Icon className="size-7 shrink-0 opacity-90" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-3xl font-semibold" data-testid={`kpi-${to}`}>{loading ? '–' : value}</span>
                <span className="block font-medium">{label}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 opacity-70" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <Section title={t.admin.overview.more}>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { to: '/verwaltung/postausgang', label: t.admin.menu.outbox, icon: Mail },
            { to: '/verwaltung/fundstelle', label: t.admin.menu.office, icon: Store },
            { to: `/o/${organisation.slug}`, label: t.admin.toPublic, icon: ChevronRight },
          ].map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex min-h-12 items-center gap-3 rounded-2xl bg-stone-50 px-4 font-medium ring-1 ring-stone-200 hover:ring-stone-300">
              <Icon className="size-5 text-brand-700" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </Section>

      {isAdmin && (
        <Card className="space-y-3 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{t.admin.overview.demoTitle}</h2>
          <p className="text-stone-700">{t.admin.overview.demoText}</p>
          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{t.admin.overview.demoConfirm}</span>
              <Button variant="danger" loading={reset.isPending} onClick={() => reset.mutate()}>
                {t.admin.overview.demoButton}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                {t.common.cancel}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" icon={<RotateCcw className="size-4" aria-hidden />} onClick={() => setConfirmReset(true)}>
              {t.admin.overview.demoButton}
            </Button>
          )}
          {reset.isError && <Alert tone="error">{toUserMessage(reset.error)}</Alert>}
        </Card>
      )}
    </div>
  )
}
