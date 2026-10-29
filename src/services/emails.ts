import { supabase } from '@/lib/supabase'
import type { SimulatedEmail } from '@/domain/types'
import { unwrap } from './errors'
import { toEmail } from './mappers'

export const listOutbox = async (organisationId: string): Promise<SimulatedEmail[]> => {
  const rows = unwrap(
    await supabase
      .from('simulated_emails')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false })
      .limit(100),
  )
  return rows.map(toEmail)
}
