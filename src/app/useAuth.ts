import { use } from 'react'
import { AuthContext, type AuthState } from './authContext'

export const useAuth = (): AuthState => {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden')
  return ctx
}

/** Für Verwaltungsseiten: Organisation ist garantiert vorhanden (siehe RequireStaff). */
export const useStaffContext = () => {
  const { membership, organisation } = useAuth()
  if (!membership || !organisation) throw new Error('useStaffContext nur innerhalb von <RequireStaff> verwenden')
  return { membership, organisation }
}
