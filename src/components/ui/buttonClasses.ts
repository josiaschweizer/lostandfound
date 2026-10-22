import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-stone-800 ring-1 ring-inset ring-stone-300 hover:bg-stone-50',
  ghost: 'text-stone-700 hover:bg-stone-100',
  danger: 'bg-white text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

export const buttonClasses = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) =>
  cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-colors whitespace-nowrap',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className,
  )

