import { createContext, use } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Membership } from '@/services/auth'
import type { Organisation } from '@/domain/types'

export interface AuthState {
  initializing: boolean
  session: Session | null
  membership: Membership | null
  organisation: Organisation | null
  membershipLoading: boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export const useAuth = (): AuthState => {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth nur innerhalb von <AuthProvider>')
  return ctx
}

/** Für Verwaltungsseiten: Mitgliedschaft und Fundstelle sind garantiert vorhanden (siehe RequireStaff). */
export const useStaff = () => {
  const { membership, organisation } = useAuth()
  if (!membership || !organisation) throw new Error('useStaff nur innerhalb von <RequireStaff>')
  return { membership, organisation, isAdmin: membership.role === 'admin' }
}
