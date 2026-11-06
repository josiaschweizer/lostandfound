import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { t } from '@/i18n/de-CH'
import { useAuth } from '@/app/auth'
import { Spinner } from '@/components/ui/Feedback'

export const RequireStaff = ({ children }: { children: ReactNode }) => {
  const { initializing, session, membership, organisation, membershipLoading } = useAuth()
  const location = useLocation()
  if (initializing || membershipLoading) return <Spinner label={t.admin.login.checking} />
  if (!session || !membership || !organisation) return <Navigate to="/verwaltung/login" replace state={{ from: location.pathname }} />
  return children
}
