import { startTransition, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { getMembership } from '@/services/auth'
import { listOffices } from '@/services/catalog'
import { AuthContext, type AuthState } from './auth'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setInitializing(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      startTransition(() => setSession(next))
      // Beim Wechsel des Kontos die Daten der vorherigen Fundstelle verwerfen (nicht beim Token-Refresh).
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') queryClient.removeQueries({ queryKey: queryKeys.staff })
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const userId = session?.user.id
  const membership = useQuery({
    queryKey: queryKeys.membership(userId ?? 'anonym'),
    queryFn: async () => {
      const m = await getMembership(userId!)
      const organisation = m ? ((await listOffices()).find((o) => o.id === m.organisationId) ?? null) : null
      return { membership: m, organisation }
    },
    enabled: Boolean(userId),
  })

  const value: AuthState = {
    initializing,
    session,
    membership: userId ? (membership.data?.membership ?? null) : null,
    organisation: userId ? (membership.data?.organisation ?? null) : null,
    membershipLoading: Boolean(userId) && membership.isPending,
  }
  return <AuthContext value={value}>{children}</AuthContext>
}
