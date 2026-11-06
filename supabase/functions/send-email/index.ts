/**
 * Edge Function «send-email»
 * Wird per pg_net-Trigger mit { id } aufgerufen, sobald eine Nachricht in
 * simulated_emails gespeichert wird, und versendet sie über Resend.
 *
 * Secrets (supabase secrets set …):
 *   RESEND_API_KEY        API-Key von resend.com
 *   EMAIL_FROM            Absender, z. B. "lostandfound <noreply@eure-domain.ch>"
 *   EMAIL_WEBHOOK_SECRET  gleicher Wert wie das Vault-Secret email_webhook_secret
 *   APP_URL               Basis-URL der App für Links, z. B. http://localhost:5173
 * Automatisch vorhanden: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildHtml, buildLink, buildText, secretMatches, type EmailRow } from './email.ts'

const RESEND_API_URL = Deno.env.get('RESEND_API_URL') ?? 'https://api.resend.com/emails'

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Nur POST' })
  if (!secretMatches(Deno.env.get('EMAIL_WEBHOOK_SECRET'), req.headers.get('x-webhook-secret'))) {
    return json(401, { error: 'Ungültiges Secret' })
  }

  const { id } = (await req.json().catch(() => ({}))) as { id?: string }
  if (!id) return json(400, { error: 'id fehlt' })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const setStatus = async (delivery_status: 'sent' | 'failed', delivery_note: string | null) => {
    const { error: updateError } = await supabase
      .from('simulated_emails')
      .update({ delivery_status, delivery_note, sent_at: delivery_status === 'sent' ? new Date().toISOString() : null })
      .eq('id', id)
    if (updateError) console.error(`Status für ${id} konnte nicht gespeichert werden:`, updateError.message)
  }

  const { data: row, error } = await supabase
    .from('simulated_emails')
    .select('id, recipient, subject, body, link_path, delivery_status')
    .eq('id', id)
    .maybeSingle<EmailRow>()
  if (error) return json(500, { error: error.message })
  if (!row) return json(404, { error: 'Nachricht nicht gefunden' })
  if (row.delivery_status !== 'pending') return json(200, { skipped: true, status: row.delivery_status })

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  if (!apiKey || !from) {
    await setStatus('failed', 'RESEND_API_KEY oder EMAIL_FROM fehlt in den Function-Secrets.')
    return json(500, { error: 'Konfiguration unvollständig' })
  }

  const link = buildLink(Deno.env.get('APP_URL') ?? 'http://localhost:5173', row.link_path)
  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [row.recipient],
        subject: row.subject,
        text: buildText(row, link),
        html: buildHtml(row, link),
      }),
    })
    const result = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!res.ok) {
      await setStatus('failed', `Resend ${res.status}: ${result.message ?? 'unbekannter Fehler'}`.slice(0, 500))
      return json(502, { error: result.message ?? 'Resend-Fehler' })
    }
    await setStatus('sent', result.id ? `Resend-ID ${result.id}` : null)
    return json(200, { sent: true, id: result.id })
  } catch (e) {
    await setStatus('failed', `Versand fehlgeschlagen: ${String(e)}`.slice(0, 500))
    return json(502, { error: String(e) })
  }
})
