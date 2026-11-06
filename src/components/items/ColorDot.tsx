import { Check } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { COLORS, type ItemColor } from '@/domain/types'
import { cn } from '@/components/ui/cn'
import { COLOR_SWATCHES } from './colorSwatches'


export const Swatch = ({ color, className }: { color: ItemColor; className?: string }) => (
  <span className={cn('inline-block size-3.5 shrink-0 rounded-full ring-1 ring-stone-400/70', className)} style={{ background: COLOR_SWATCHES[color] }} aria-hidden />
)

/** Farbe nie nur als Punkt: immer Punkt + Farbname (KONZEPT 9.2). */
export const ColorLabels = ({ colors, className }: { colors: readonly ItemColor[]; className?: string }) => (
  <span className={cn('inline-flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
    {colors.map((color) => (
      <span key={color} className="inline-flex items-center gap-1.5">
        <Swatch color={color} />
        {t.labels.colors[color]}
      </span>
    ))}
  </span>
)

/** Mehrfachauswahl der Farben als Farbpunkte mit Namen. */
export const ColorPicker = ({
  value,
  onChange,
  max = 3,
  idPrefix,
  className,
}: {
  value: readonly ItemColor[]
  onChange: (colors: ItemColor[]) => void
  max?: number
  idPrefix?: string
  className?: string
}) => (
  <div className={cn('flex flex-wrap gap-2', className)} role="group">
    {COLORS.map((color) => {
      const selected = value.includes(color)
      const disabled = !selected && value.length >= max
      return (
        <button
          key={color}
          id={idPrefix ? `${idPrefix}-${color}` : undefined}
          type="button"
          aria-pressed={selected}
          disabled={disabled}
          onClick={() => onChange(selected ? value.filter((c) => c !== color) : [...value, color])}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1 transition disabled:opacity-40',
            selected ? 'bg-stone-900 text-white ring-stone-900' : 'bg-white text-stone-800 ring-stone-300 hover:ring-stone-500',
          )}
        >
          <Swatch color={color} className={selected ? 'ring-white/70' : undefined} />
          {t.labels.colors[color]}
          {selected && <Check className="size-4" aria-hidden />}
        </button>
      )
    })}
  </div>
)
