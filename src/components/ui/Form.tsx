import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Sparkles } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { cn } from './cn'

export interface FieldControlProps {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

interface FieldProps {
  label: string
  required?: boolean
  hint?: ReactNode
  error?: string
  /** Von der KI ausgefüllt → dezenter Hinweis; unsicher → gelb markiert (KONZEPT 7.2) */
  aiState?: 'filled' | 'uncertain'
  className?: string
  /** Für Felder mit eigenem Label (z. B. Farbauswahl) */
  as?: 'div' | 'fieldset'
  children: (props: FieldControlProps) => ReactNode
}

export const Field = ({ label, required, hint, error, aiState, className, as = 'div', children }: FieldProps) => {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  const Label = as === 'fieldset' ? 'legend' : 'label'
  const Wrapper = as
  return (
    <Wrapper className={cn('min-w-0', className, aiState === 'uncertain' && 'rounded-xl bg-amber-50 p-2 ring-1 ring-amber-300')}>
      <Label {...(as === 'div' ? { htmlFor: id } : {})} className="mb-1.5 block font-medium text-stone-800">
        {label}
        {required && (
          <span className="ml-0.5 text-red-700" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only"> ({t.common.required})</span>}
      </Label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {aiState && (
        <p className={cn('mt-1 flex items-center gap-1 text-sm', aiState === 'uncertain' ? 'text-amber-800' : 'text-brand-700')}>
          <Sparkles className="size-4 shrink-0" aria-hidden />
          {aiState === 'uncertain' ? t.ai.uncertain : t.ai.filled}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-sm text-stone-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </Wrapper>
  )
}

const control =
  'block w-full rounded-xl border-0 bg-white px-3 py-2.5 text-base text-stone-900 ring-1 ring-inset ring-stone-300 placeholder:text-stone-500 focus:ring-2 focus:ring-brand-600 focus:outline-none aria-invalid:ring-red-500 disabled:bg-stone-100'

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(control, 'min-h-11', className)} {...props} />
)

export const Textarea = ({ className, rows = 3, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea rows={rows} className={cn(control, className)} {...props} />
)

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = ({ options, placeholder, className, ...props }: SelectProps) => (
  <select className={cn(control, 'min-h-11 pr-8', className)} {...props}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
)

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
}

export const Checkbox = ({ label, description, className, ...props }: CheckboxProps) => (
  <label className={cn('flex min-h-11 cursor-pointer items-start gap-3', className)}>
    <input type="checkbox" className="mt-1 size-5 shrink-0 rounded border-stone-400 accent-brand-600" {...props} />
    <span>
      <span className="block font-medium text-stone-800">{label}</span>
      {description && <span className="block text-sm text-stone-600">{description}</span>}
    </span>
  </label>
)

/** Legende «* Pflichtfeld» (KONZEPT 9.2) */
export const RequiredLegend = () => <p className="text-sm text-stone-600">{t.common.requiredLegend}</p>

/** Alle Fehler gesammelt oben, mit Sprunglinks zu den Feldern (T16). */
export const ErrorSummary = ({ errors }: { errors: { field: string; message: string }[] }) => {
  if (errors.length === 0) return null
  return (
    <div role="alert" className="rounded-2xl bg-red-50 p-4 text-red-900 ring-1 ring-red-200">
      <p className="font-semibold">{t.common.errorsTitle}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map((error) => (
          <li key={error.field}>
            <a
              href={`#field-${error.field}`}
              className="underline underline-offset-2"
              onClick={(event) => {
                event.preventDefault()
                const element = document.querySelector<HTMLElement>(`[data-field="${error.field}"] input, [data-field="${error.field}"] select, [data-field="${error.field}"] textarea, [data-field="${error.field}"] button`)
                element?.focus()
                element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
              }}
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
