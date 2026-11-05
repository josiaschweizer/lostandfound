import { useQuery } from '@tanstack/react-query'
import { t } from '@/i18n/de-CH'
import { cn } from '@/components/ui/cn'
import { supabase } from '@/lib/supabase'

type Status = { kind: 'ok'; count: number } | { kind: 'noSchema' }

/** PostgREST meldet eine fehlende Tabelle mit PGRST205 bzw. Postgres 42P01 – die Verbindung steht dann trotzdem. */
const MISSING_TABLE = new Set(['PGRST205', '42P01'])

const checkConnection = async (): Promise<Status> => {
  const { count, error } = await supabase.from('organisations').select('*', { count: 'exact', head: true })
  if (!error) return { kind: 'ok', count: count ?? 0 }
  if (MISSING_TABLE.has(error.code)) return { kind: 'noSchema' }
  throw new Error(error.message)
}

/** Entwicklungshilfe (Etappe 1): zeigt, ob die Datenbank erreichbar ist. Nur mit `pnpm dev` sichtbar. */
export const DbStatus = () => {
  const query = useQuery({ queryKey: ['db-status'], queryFn: checkConnection, retry: false })

  const text = query.isPending
    ? t.dbStatus.checking
    : query.isError
      ? t.dbStatus.error
      : query.data.kind === 'ok'
        ? t.dbStatus.ok(query.data.count)
        : t.dbStatus.noSchema

  return (
    <p
      data-testid="db-status"
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ring-1',
        query.isError ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-white text-stone-700 ring-stone-200',
      )}
    >
      <span
        aria-hidden
        className={cn('size-2 rounded-full', query.isPending ? 'bg-stone-400' : query.isError ? 'bg-red-600' : 'bg-emerald-600')}
      />
      {t.dbStatus.label}: {text}
    </p>
  )
}
