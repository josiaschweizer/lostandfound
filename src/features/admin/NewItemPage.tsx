import { useState } from 'react'
import { Link } from 'react-router'
import { CheckCircle2, ClipboardList, PackagePlus } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { saveItem } from '@/services/staff'
import { ButtonLink, Button } from '@/components/ui/Button'
import { Card, PageHeader } from '@/components/ui/Layout'
import { AiStatusLine } from '@/features/ai/AiStatusLine'
import { useSemanticMatch } from '@/features/ai/useSemanticMatch'
import { ItemForm } from './ItemForm'
import { useItemMatches } from './queries'
import { useInvalidate } from './useInvalidate'

/** Fund erfassen. Nach dem Speichern: Fundnummer, passende Verlustmeldungen, «Nächsten Fund erfassen». */
export const NewItemPage = () => {
  const invalidate = useInvalidate()
  const [saved, setSaved] = useState<{ id: string; itemNumber: string } | null>(null)
  const [formKey, setFormKey] = useState(0)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.admin.itemForm.newTitle} />
      {saved ? (
        <SavedPanel
          saved={saved}
          onNext={() => {
            setSaved(null)
            setFormKey((key) => key + 1)
            window.scrollTo({ top: 0 })
          }}
        />
      ) : (
        <ItemForm
          key={formKey}
          onSubmit={async (input) => {
            const result = await saveItem(null, input)
            await invalidate()
            setSaved(result)
            window.scrollTo({ top: 0 })
          }}
        />
      )}
    </div>
  )
}

const SavedPanel = ({ saved, onNext }: { saved: { id: string; itemNumber: string }; onNext: () => void }) => {
  const matches = useItemMatches(saved.id)
  const invalidate = useInvalidate()
  // Gegen offene Verlustmeldungen auch mit KI prüfen (KONZEPT 7.4) – die Liste aktualisiert sich danach.
  const ai = useSemanticMatch({ itemId: saved.id }, invalidate)
  const kiCount = (matches.data ?? []).filter((m) => m.source === 'ki').length
  const count = matches.data?.length ?? 0
  return (
    <Card className="space-y-4 p-5 sm:p-6" data-testid="item-saved">
      <p className="flex items-center gap-2 text-xl font-semibold text-emerald-800" role="status">
        <CheckCircle2 className="size-6" aria-hidden />
        {t.admin.itemForm.saved(saved.itemNumber)}
      </p>
      <AiStatusLine running={ai.running} text={ai.running ? t.ai.matchRunningStaff : kiCount > 0 ? t.ai.matchFoundStaff(kiCount) : null} />
      {count > 0 && (
        <Link to={`/verwaltung/funde/${saved.id}`} className="flex min-h-12 items-center gap-2 rounded-2xl bg-brand-50 px-4 font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100">
          <ClipboardList className="size-5" aria-hidden />
          {t.admin.itemForm.matchingReports(count)}
        </Link>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="lg" icon={<PackagePlus className="size-5" aria-hidden />} onClick={onNext}>
          {t.admin.itemForm.nextItem}
        </Button>
        <ButtonLink to="/verwaltung/funde" variant="secondary" size="lg">
          {t.admin.itemForm.toList}
        </ButtonLink>
      </div>
    </Card>
  )
}
