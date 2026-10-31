import { supabase } from '@/lib/supabase'
import { unwrap } from './errors'

/** Demo-Zugänge aus supabase/migrations/…_demo.sql (erfundene Personen). */
export const DEMO_PASSWORD = 'demo1234'

export const DEMO_ACCOUNTS = [
  { email: 'lea.brunner@bbz-seetal.example', name: 'Lea Brunner', organisation: 'Berufsbildungszentrum Seetal' },
  { email: 'marco.keller@lindenau.example', name: 'Marco Keller', organisation: 'Fundbüro Stadt Lindenau' },
  { email: 'sara.huber@nordwind-logistik.example', name: 'Sara Huber', organisation: 'Nordwind Logistik AG' },
  { email: 'luca.ammann@regionalverkehr-seetal.example', name: 'Luca Ammann', organisation: 'Regionalverkehr Seetal' },
] as const

/** Setzt alle Daten auf die Beispieldaten zurück und entfernt neu registrierte Konten. */
export const resetDemo = async (): Promise<void> => {
  unwrap(await supabase.rpc('reset_demo'))
}
