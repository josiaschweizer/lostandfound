import { Sparkles } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { isAiReason, reasonLabels } from '@/domain/reasons'

/** 1–3 Begründungs-Chips in Alltagssprache, ohne Score (KONZEPT 6.5); KI-Treffer mit Chip «Vorschlag mit KI» (7.4). */
export const ReasonChips = ({ reasons }: { reasons: string[] }) => (
  <ul className="flex flex-wrap gap-1.5" aria-label="Warum dieser Vorschlag">
    {isAiReason(reasons) && <AiChip as="li" />}
    {reasonLabels(reasons).map((label) => (
      <li key={label} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-medium text-brand-800 ring-1 ring-brand-100 ring-inset">
        {label}
      </li>
    ))}
  </ul>
)

/** Kennzeichnung für alles, was die KI vorgeschlagen hat. */
export const AiChip = ({ as: Tag = 'span', label = t.ai.chip }: { as?: 'span' | 'li'; label?: string }) => (
  <Tag className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-violet-50 px-2.5 py-0.5 text-sm font-medium text-violet-800 ring-1 ring-violet-200 ring-inset">
    <Sparkles className="size-3.5" aria-hidden />
    {label}
  </Tag>
)
