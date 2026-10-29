import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Check, Lock, PackageCheck, X } from 'lucide-react'
import { useStaffContext } from '@/app/useAuth'
import { formatDateTime } from '@/domain/dates'
import { canConfirmRequest, canRejectRequest } from '@/domain/workflow'
import { draftDecisionText } from '@/services/ai'
import { toUserMessage } from '@/services/errors'
import { AiButton, AiNote } from '@/components/ai/AiButton'
import { ItemImage } from '@/components/items/ItemVisual'
import { ItemStatusBadge, RequestStatusBadge } from '@/components/items/StatusBadges'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback'
import { Field, Textarea } from '@/components/ui/Form'
import { CardSection, DefinitionList, PageHeader } from '@/components/ui/Layout'
import { SimulatedEmailCard } from '@/components/items/SimulatedEmailCard'
import { useChangeItemStatus, useDecideRequest, useOutbox, useRequests, useStaffItem } from './queries'
import { RejectOpenRequests } from './RejectOpenRequests'

type Mode = 'idle' | 'confirm' | 'reject'

/** Anfrage prüfen: Eigentumsnachweis neben internem Merkmal, dann bestätigen oder ablehnen. */
export const RequestDetailPage = () => {
  const { id = '' } = useParams()
  const { organisation } = useStaffContext()
  const requests = useRequests()
  const request = requests.data?.find((r) => r.id === id)
  const item = useStaffItem(request?.itemId ?? '')
  const decide = useDecideRequest()
  const changeStatus = useChangeItemStatus()
  const outbox = useOutbox()
  const [mode, setMode] = useState<Mode>('idle')
  const [pickup, setPickup] = useState(organisation.office.pickupNotes ?? '')
  const [note, setNote] = useState('')
  const [draft, setDraft] = useState<{ loading: boolean; error: string | null; done: Mode | null }>({ loading: false, error: null, done: null })

  if (requests.isPending || (request && item.isPending)) return <Spinner />
  if (requests.isError) return <ErrorState error={requests.error} />
  if (!request || !item.data) return <EmptyState title="Anfrage nicht gefunden">Sie gehört nicht zu Ihrer Organisation.</EmptyState>

  const others = (requests.data ?? []).filter((r) => r.itemId === request.itemId && r.id !== request.id)
  const openOthers = others.filter((r) => r.status === 'open' || r.status === 'confirmed')
  const canConfirm = canConfirmRequest(request, item.data.status, others)
  const canReject = canRejectRequest(request)
  const messages = (outbox.data ?? []).filter((m) => m.returnRequestId === request.id)

  /** KI formuliert aus den Stichworten einen Text. Name, Kontakt und internes Erkennungsmerkmal werden nicht mitgeschickt. */
  const draftText = async (kind: 'confirm' | 'reject') => {
    setDraft({ loading: true, error: null, done: null })
    try {
      const text = await draftDecisionText({
        kind,
        itemTitle: item.data!.title,
        itemNumber: item.data!.itemNumber,
        officeName: organisation.office.name,
        officeLocation: organisation.office.location,
        openingHours: organisation.office.openingHours,
        pickupNotes: organisation.office.pickupNotes ?? '',
        notes: kind === 'confirm' ? pickup : note,
      })
      if (kind === 'confirm') setPickup(text)
      else setNote(text)
      setDraft({ loading: false, error: null, done: kind === 'confirm' ? 'confirm' : 'reject' })
    } catch (error) {
      setDraft({ loading: false, error: toUserMessage(error), done: null })
    }
  }

  const aiRow = (kind: 'confirm' | 'reject') => (
    <div className="flex flex-wrap items-center gap-3">
      <AiButton onClick={() => draftText(kind)} loading={draft.loading}>
        Text formulieren
      </AiButton>
      {draft.done === kind && <AiNote />}
      {draft.error && <p className="text-xs font-medium text-red-700">{draft.error}</p>}
    </div>
  )

  const submitDecision = (confirm: boolean) =>
    decide.mutate(
      { id: request.id, decision: { confirm, pickupInstructions: pickup, note } },
      { onSuccess: () => setMode('idle') },
    )

  return (
    <div className="space-y-6">
      <BackLink to="/verwaltung/anfragen" label="Zu den Anfragen" />
      <PageHeader eyebrow="Rückgabeanfrage" title={request.claimantName} actions={<RequestStatusBadge status={request.status} />} />

      {openOthers.length > 0 && request.status !== 'completed' && (
        <Alert tone="warning" title={`${openOthers.length} weitere Anfrage${openOthers.length > 1 ? 'n' : ''} für diesen Gegenstand`}>
          Vergleichen Sie die Eigentumsnachweise, bevor Sie bestätigen.{' '}
          {openOthers.map((o, i) => (
            <span key={o.id}>
              {i > 0 && ', '}
              <Link className="font-medium underline" to={`/verwaltung/anfragen/${o.id}`}>
                {o.claimantName}
              </Link>
            </span>
          ))}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <CardSection title="Angaben der suchenden Person">
          <DefinitionList
            items={[
              { label: 'Name', value: request.claimantName },
              { label: 'Kontakt', value: request.claimantContact },
              { label: 'Eingegangen', value: formatDateTime(request.createdAt) },
              { label: 'Nachricht', value: request.message },
            ]}
          />
          <div className="mt-4 rounded-xl bg-sky-50 p-4 ring-1 ring-sky-200">
            <p className="text-xs font-semibold tracking-wide text-sky-800 uppercase">Eigentumsnachweis</p>
            <p className="mt-1 text-stone-900">{request.proofDescription}</p>
          </div>
        </CardSection>

        <CardSection title="Gegenstand">
          <Link to={`/verwaltung/gegenstand/${item.data.id}`} className="mb-4 flex items-center gap-3 hover:text-brand-700">
            <ItemImage photoPath={item.data.photoPath} category={item.data.category} title={item.data.title} className="size-14 rounded-lg" />
            <span>
              <span className="block font-medium">{item.data.title}</span>
              <span className="block font-mono text-xs text-stone-500">{item.data.itemNumber}</span>
            </span>
            <span className="ml-auto">
              <ItemStatusBadge status={item.data.status} />
            </span>
          </Link>
          <div className="rounded-xl bg-accent-50 p-4 ring-1 ring-accent-100">
            <p className="flex items-center gap-1 text-xs font-semibold tracking-wide text-accent-700 uppercase">
              <Lock className="size-3.5" aria-hidden /> Internes Erkennungsmerkmal
            </p>
            <p className="mt-1 text-stone-900">{item.data.internal.identifyingFeature || <span className="text-stone-500">Kein Merkmal erfasst.</span>}</p>
            {item.data.internal.storageLocation && <p className="mt-2 text-sm text-stone-600">Aufbewahrt: {item.data.internal.storageLocation}</p>}
          </div>
        </CardSection>
      </div>

      <CardSection title="Entscheidung">
        {request.status === 'confirmed' && (
          <div className="space-y-4">
            <Alert tone="success" title="Bestätigt – Abholhinweise wurden an die Person gesendet">
              <p className="whitespace-pre-line">{request.pickupInstructions}</p>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="success"
                icon={<PackageCheck className="size-4" />}
                loading={changeStatus.isPending}
                onClick={() => changeStatus.mutate({ id: item.data!.id, status: 'returned' })}
              >
                Übergabe erfolgt – als zurückgegeben markieren
              </Button>
              <Button variant="danger" icon={<X className="size-4" />} onClick={() => setMode('reject')}>
                Doch ablehnen
              </Button>
            </div>
          </div>
        )}
        {request.status === 'completed' && (
          <div className="space-y-3">
            <Alert tone="success" title="Abgeschlossen">Der Gegenstand wurde dieser Person übergeben.</Alert>
            <RejectOpenRequests requests={others} />
          </div>
        )}
        {request.status === 'rejected' && (
          <Alert tone="info" title="Abgelehnt">
            {request.decisionNote ?? 'Ohne Begründung.'}
          </Alert>
        )}
        {request.status === 'open' && mode === 'idle' && (
          <div className="flex flex-wrap gap-2">
            <Button icon={<Check className="size-4" />} disabled={!canConfirm} onClick={() => setMode('confirm')}>
              Bestätigen
            </Button>
            <Button variant="danger" icon={<X className="size-4" />} disabled={!canReject} onClick={() => setMode('reject')}>
              Ablehnen
            </Button>
            {!canConfirm && (
              <p className="w-full text-sm text-stone-500">
                {item.data.status === 'returned'
                  ? 'Der Gegenstand wurde bereits zurückgegeben.'
                  : 'Für diesen Gegenstand ist bereits eine andere Anfrage bestätigt.'}
              </p>
            )}
          </div>
        )}
        {mode === 'confirm' && (
          <div className="space-y-4">
            <Field label="Abholhinweise für die suchende Person" required hint="Werden in der Bestätigung per E-Mail und auf der Statusseite angezeigt.">
              {(p) => <Textarea rows={3} value={pickup} onChange={(e) => setPickup(e.target.value)} {...p} />}
            </Field>
            {aiRow('confirm')}
            <p className="text-sm text-stone-600">
              Ort: {organisation.office.location} · {organisation.office.openingHours}
            </p>
            <div className="flex gap-2">
              <Button loading={decide.isPending} disabled={!pickup.trim()} onClick={() => submitDecision(true)}>
                Anfrage bestätigen und reservieren
              </Button>
              <Button variant="ghost" onClick={() => setMode('idle')}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}
        {mode === 'reject' && (
          <div className="space-y-4">
            <Field label="Begründung" hint="Wird der suchenden Person per E-Mail mitgeteilt. Tipp: Stichworte eingeben und «Text formulieren» wählen.">
              {(p) => <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} {...p} />}
            </Field>
            {aiRow('reject')}
            <div className="flex gap-2">
              <Button variant="danger" loading={decide.isPending} onClick={() => submitDecision(false)}>
                Anfrage ablehnen
              </Button>
              <Button variant="ghost" onClick={() => setMode('idle')}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}
        {decide.isError && <Alert tone="error" className="mt-3">{toUserMessage(decide.error)}</Alert>}
        {changeStatus.isError && <Alert tone="error" className="mt-3">{toUserMessage(changeStatus.error)}</Alert>}
      </CardSection>

      {messages.length > 0 && (
        <CardSection title="Nachrichten an diese Person" description="Bestätigung und Entscheid, wie sie per E-Mail versendet wurden.">
          <div className="space-y-3">
            {messages.map((email) => (
              <SimulatedEmailCard key={email.id} email={email} />
            ))}
          </div>
        </CardSection>
      )}
    </div>
  )
}
