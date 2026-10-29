import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { MessageCircle, SendHorizontal, Sparkles, X } from 'lucide-react'
import { useDock } from '@/app/dock'
import { formatRelativeDay } from '@/domain/dates'
import { sendChat, type ChatItem, type ChatMessage } from '@/services/ai'
import { toUserMessage } from '@/services/errors'
import { ItemImage } from '@/components/items/ItemVisual'
import { cn } from '@/components/ui/cn'

interface Entry extends ChatMessage {
  items?: ChatItem[]
}

const GREETING: Entry = {
  role: 'assistant',
  content: 'Hallo! Ich helfe Ihnen, einen verlorenen Gegenstand zu finden. Was haben Sie verloren – und wo ungefähr?',
}

const SUGGESTIONS = ['Ich habe meinen Rucksack verloren', 'Wie bekomme ich einen Gegenstand zurück?', 'Wann haben die Fundstellen offen?']

const ItemLink = ({ item, onOpen }: { item: ChatItem; onOpen: () => void }) => (
  <Link
    to={`/fund/${item.id}`}
    onClick={onOpen}
    className="flex items-center gap-3 rounded-xl bg-white p-2 ring-1 ring-stone-200 transition hover:ring-brand-300"
  >
    <ItemImage photoPath={item.photoPath} category={item.category} title={item.title} className="size-12 shrink-0 rounded-lg" />
    <span className="min-w-0 text-sm">
      <span className="block truncate font-medium text-stone-900">{item.title}</span>
      <span className="block truncate text-xs text-stone-500">
        {[item.organisationName, formatRelativeDay(item.foundOn)].filter(Boolean).join(' · ')}
        {item.status === 'reserved' && ' · reserviert'}
      </span>
    </span>
  </Link>
)

/** Schwebender KI-Assistent für Suchende. Sieht nur öffentliche Daten und kann nichts verändern. */
export const AssistantWidget = () => {
  const { slot, openPanel, setOpenPanel } = useDock()
  const open = openPanel === 'assistant'
  const [entries, setEntries] = useState<Entry[]>([GREETING])
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const chat = useMutation({
    mutationFn: (history: Entry[]) => sendChat(history.map(({ role, content }) => ({ role, content }))),
    onSuccess: (result) => setEntries((prev) => [...prev, { role: 'assistant', content: result.reply, items: result.items.slice(0, 4) }]),
  })

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [entries, chat.isPending, chat.isError])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const close = () => {
    setOpenPanel(null)
    toggleRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /** Auf kleinen Bildschirmen deckt der Assistent die Seite ab – beim Öffnen eines Treffers schliessen. */
  const onOpenItem = () => {
    if (window.matchMedia('(max-width: 639px)').matches) setOpenPanel(null)
  }

  const send = (text: string) => {
    const content = text.trim()
    if (!content || chat.isPending) return
    const next = [...entries, { role: 'user' as const, content }]
    setEntries(next)
    setInput('')
    chat.mutate(next)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  if (!slot) return null

  return createPortal(
    <>
      {open && (
        <section
          aria-label="Fund-Assistent"
          className="flex h-[min(36rem,calc(100dvh-10rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl bg-stone-50 shadow-2xl ring-1 ring-stone-200"
        >
          <header className="flex items-center justify-between gap-3 bg-brand-700 px-4 py-3 text-white">
            <div>
              <p className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="size-4" aria-hidden /> Fund-Assistent
              </p>
              <p className="text-xs text-brand-100">KI · Antworten können Fehler enthalten</p>
            </div>
            <button type="button" className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Assistent schliessen" onClick={close}>
              <X className="size-5" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {entries.map((entry, i) => (
              <div key={i} className={cn('flex flex-col gap-2', entry.role === 'user' ? 'items-end' : 'items-start')}>
                <p
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line',
                    entry.role === 'user' ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-white text-stone-800 ring-1 ring-stone-200',
                  )}
                >
                  {entry.content}
                </p>
                {entry.items && entry.items.length > 0 && (
                  <div className="w-full space-y-2">
                    {entry.items.map((item) => (
                      <ItemLink key={item.id} item={item} onOpen={onOpenItem} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {chat.isPending && (
              <p className="flex items-center gap-2 text-sm text-stone-500" role="status">
                <span className="size-4 animate-spin rounded-full border-2 border-brand-600 border-r-transparent" aria-hidden />
                Suche läuft …
              </p>
            )}
            {chat.isError && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-900 ring-1 ring-red-200" role="alert">
                {toUserMessage(chat.error)}{' '}
                <button type="button" className="font-medium underline" onClick={() => chat.mutate(entries)}>
                  Erneut versuchen
                </button>
              </div>
            )}
            {entries.length === 1 && !chat.isPending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-stone-700 ring-1 ring-stone-200 hover:ring-brand-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-stone-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <label htmlFor="assistant-input" className="sr-only">
                Nachricht an den Assistenten
              </label>
              <textarea
                id="assistant-input"
                ref={inputRef}
                rows={1}
                maxLength={2000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Nachricht schreiben …"
                className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border-0 bg-stone-100 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || chat.isPending}
                aria-label="Senden"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
              >
                <SendHorizontal className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-stone-500">Bitte keine Namen, Kontaktdaten oder Eigentumsmerkmale eingeben.</p>
          </form>
        </section>
      )}

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpenPanel(open ? null : 'assistant')}
        aria-expanded={open}
        aria-label={open ? 'Assistent schliessen' : 'Assistent öffnen'}
        className="flex h-10 items-center gap-2 rounded-full bg-brand-700 px-4 font-medium text-white shadow-lg transition hover:bg-brand-800"
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        <span className="text-sm">{open ? 'Schliessen' : 'Fragen?'}</span>
      </button>
    </>,
    slot,
  )
}
