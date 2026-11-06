import { reasonLabels } from '@/domain/reasons'

/** 1–3 Begründungs-Chips in Alltagssprache, ohne Score (KONZEPT 6.5). */
export const ReasonChips = ({ reasons }: { reasons: string[] }) => (
  <ul className="flex flex-wrap gap-1.5" aria-label="Warum dieser Vorschlag">
    {reasonLabels(reasons).map((label) => (
      <li key={label} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-medium text-brand-800 ring-1 ring-brand-100 ring-inset">
        {label}
      </li>
    ))}
  </ul>
)
