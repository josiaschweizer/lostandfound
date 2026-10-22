import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router'
import { buttonClasses, type ButtonSize as Size, type ButtonVariant as Variant } from './buttonClasses'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export const Button = ({ variant, size, loading, icon, className, children, disabled, type = 'button', ...rest }: ButtonProps) => (
  <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} {...rest}>
    {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> : icon}
    {children}
  </button>
)

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export const ButtonLink = ({ variant, size, icon, className, children, ...rest }: ButtonLinkProps) => (
  <Link className={buttonClasses(variant, size, className)} {...rest}>
    {icon}
    {children}
  </Link>
)
