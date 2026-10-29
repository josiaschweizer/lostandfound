import { useState } from 'react'
import { X } from 'lucide-react'
import type { ReturnRequest } from '@/domain/types'
import { toUserMessage } from '@/services/errors'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Feedback'
import { Textarea } from '@/components/ui/Form'
import { ALREADY_RETURNED_NOTE, useRejectRequests } from './queries'

/**
 * Nach der Übergabe: übrige offene Anfragen zum selben Gegenstand mit einem Klick ablehnen.
 * Der vorgeschlagene Text kann angepasst werden; jede Person erhält eine Nachricht.
 */
export const RejectOpenRequests = ({ requests }: { requests: ReturnRequest[] }) => {
  const reject = useRejectRequests()
  const [note, setNote] = useState(ALREADY_RETURNED_NOTE)
  const open = requests.filter((r) => r.status === 'open')

  if (reject.isSuccess && open.length === 0) {
    return <Alert tone="success">{reject.data === 1 ? 'Die übrige Anfrage wurde abgelehnt.' : `${reject.data} übrige Anfragen wurden abgelehnt.`}</Alert>
  }
  if (open.length === 0) return null

  return (
    <Alert tone="warning" title={`${open.length} weitere offene Anfrage${open.length > 1 ? 'n' : ''} zu diesem Gegenstand`}>
      <p>Der Gegenstand ist übergeben. Die übrigen Personen erhalten eine Absage mit diesem Text:</p>
      <Textarea aria-label="Begründung der Absage" rows={3} className="mt-2" value={note} onChange={(e) => setNote(e.target.value)} />
      <p className="mt-1 text-xs">Betrifft: {open.map((r) => r.claimantName).join(', ')}</p>
      <Button
        variant="danger"
        size="sm"
        className="mt-2"
        icon={<X className="size-4" />}
        loading={reject.isPending}
        onClick={() => reject.mutate({ ids: open.map((r) => r.id), note })}
      >
        {open.length > 1 ? `Alle ${open.length} ablehnen` : 'Ablehnen'}
      </Button>
      {reject.isError && <p className="mt-2 font-medium text-red-700">{toUserMessage(reject.error)}</p>}
    </Alert>
  )
}
