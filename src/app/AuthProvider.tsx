import { startTransition, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { getMembership } from '@/services/auth'
import { getOrganisationById } from '@/services/organisations'
import { AuthContext, type AuthState } from './authContext'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setInitializing(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // Als Transition – wie die Navigation von React Router –, damit ein Wechsel der Seite
      // und der Sitzung gemeinsam gerendert wird (kein kurzer Umweg über die Login-Seite).
      startTransition(() => setSession(next))
      // Daten der vorherigen Organisation verwerfen, damit nichts vermischt wird.
      queryClient.removeQueries({ queryKey: ['staff'] })
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const userId = session?.user.id
  const membershipQuery = useQuery({
    queryKey: queryKeys.membership(userId ?? 'anonymous'),
    queryFn: async () => {
      const membership = await getMembership(userId!)
      const organisation = membership ? await getOrganisationById(membership.organisationId) : null
      return { membership, organisation }
    },
    enabled: Boolean(userId),
  })

  const value: AuthState = {
    initializing,
    session,
    membership: userId ? (membershipQuery.data?.membership ?? null) : null,
    organisation: userId ? (membershipQuery.data?.organisation ?? null) : null,
    membershipLoading: Boolean(userId) && membershipQuery.isPending,
  }

  return <AuthContext value={value}>{children}</AuthContext>
}
