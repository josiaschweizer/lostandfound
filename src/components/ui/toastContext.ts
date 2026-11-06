import { createContext, use } from 'react'

/** Bestätigungen nach Aktionen als Toast (5 s), wo sinnvoll mit «Rückgängig» (KONZEPT 9.2). */
export interface ToastOptions {
  message: string
  action?: { label: string; onClick: () => void }
  tone?: 'default' | 'error'
}

export const ToastContext = createContext<(options: ToastOptions) => void>(() => {})

export const useToast = () => use(ToastContext)
