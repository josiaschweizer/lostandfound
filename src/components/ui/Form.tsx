import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from './cn'

const CONTROL =
  'block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-xs ring-1 ring-inset ring-stone-300 ' +
  'placeholder:text-stone-400 focus:ring-2 focus:ring-brand-600 focus:outline-none disabled:bg-stone-100'
const INVALID = 'ring-red-500 focus:ring-red-600'

interface FieldProps {
  label: string
  required?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}

export const Field = ({ label, required, hint, error, className, children }: FieldProps) => {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-stone-800">
        {label}
        {required ? (
          <span className="ml-0.5 text-red-600" aria-hidden>
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-stone-500">(optional)</span>
        )}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(CONTROL, props['aria-invalid'] === true && INVALID, className)} {...props} />
)

export const Textarea = ({ className, rows = 3, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea rows={rows} className={cn(CONTROL, props['aria-invalid'] === true && INVALID, className)} {...props} />
)

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = ({ className, options, placeholder, ...props }: SelectProps) => (
  <select className={cn(CONTROL, 'pr-8', props['aria-invalid'] === true && INVALID, className)} {...props}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
)

export const Checkbox = ({ label, description, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) => {
  const id = useId()
  return (
    <div className="flex gap-3">
      <input id={id} type="checkbox" className="mt-0.5 size-4 rounded border-stone-300 text-brand-600 focus:ring-brand-600" {...props} />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-stone-800">{label}</span>
        {description && <span className="block text-stone-500">{description}</span>}
      </label>
    </div>
  )
}

export const RequiredNote = () => (
  <p className="text-xs text-stone-500">
    Felder mit <span className="text-red-600">*</span> sind Pflichtfelder.
  </p>
)
