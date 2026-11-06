import { supabase } from '@/lib/supabase'
import type { MemberRole } from '@/domain/types'
import { unwrap } from './errors'

export interface Membership {
  userId: string
  organisationId: string
  fullName: string
  role: MemberRole
}

export const signIn = async (email: string, password: string): Promise<void> => {
  unwrap(await supabase.auth.signInWithPassword({ email, password }))
}

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getMembership = async (userId: string): Promise<Membership | null> => {
  const row = unwrap(await supabase.from('memberships').select('*').eq('user_id', userId).maybeSingle()) as Record<string, unknown> | null
  return row
    ? { userId: row.user_id as string, organisationId: row.organisation_id as string, fullName: row.full_name as string, role: row.role as MemberRole }
    : null
}

/** Demo-Konten aus supabase/migrations/…_demo.sql (alle erfunden). */
export const DEMO_PASSWORD = 'demo1234'
export const DEMO_ACCOUNTS = [
  { office: 'Berufsschule Musterstadt', admin: 'sandra.keller@bs-musterstadt.example', staff: 'marco.huber@bs-musterstadt.example' },
  { office: 'Tierpark Sonnenberg', admin: 'lea.frei@tierpark-sonnenberg.example', staff: 'nico.baumann@tierpark-sonnenberg.example' },
  { office: 'Hotel Bergblick', admin: 'claudia.roth@hotel-bergblick.example', staff: 'jonas.weber@hotel-bergblick.example' },
  { office: 'Kulturhaus am Platz', admin: 'elena.rossi@kulturhaus-am-platz.example', staff: 'tim.meier@kulturhaus-am-platz.example' },
] as const
