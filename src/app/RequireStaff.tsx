import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Spinner } from '@/components/ui/Feedback'
import { useAuth } from './useAuth'

export const RequireStaff = ({ children }: { children: ReactNode }) => {
  const { initializing, session, membership, organisation, membershipLoading } = useAuth()
  const location = useLocation()

  if (initializing || membershipLoading) return <Spinner label="Anmeldung wird geprüft …" />
  if (!session) return <Navigate to="/anmelden" replace state={{ from: location.pathname }} />
  if (!membership || !organisation) return <Navigate to="/registrieren" replace />
  return children
}
