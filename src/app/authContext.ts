import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { OrganisationWithOffice, StaffMember } from '@/domain/types'

export interface AuthState {
  /** true, bis die gespeicherte Sitzung geprüft wurde */
  initializing: boolean
  session: Session | null
  membership: StaffMember | null
  organisation: OrganisationWithOffice | null
  membershipLoading: boolean
}

export const AuthContext = createContext<AuthState | null>(null)
