/** Reine Hilfsfunktionen für den Mailversand (ohne Netzwerk, testbar). */

export interface EmailRow {
  id: string
  recipient: string
  subject: string
  body: string
  link_path: string | null
  delivery_status: string
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Absoluter Link zur App (APP_URL + link_path). */
export const buildLink = (appUrl: string, linkPath: string | null): string | null =>
  linkPath ? `${appUrl.replace(/\/+$/, '')}${linkPath.startsWith('/') ? '' : '/'}${linkPath}` : null

export const buildText = (row: EmailRow, link: string | null): string =>
  [row.body, link ? `\nLink: ${link}` : '', '\n—\nlostandfound (Schulprojekt M245)'].join('\n')

export const buildHtml = (row: EmailRow, link: string | null): string => `<!doctype html>
<html lang="de-CH"><body style="margin:0;background:#f5f5f4;font-family:Inter,Arial,sans-serif;color:#1c1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7e5e4">
        <tr><td style="background:#0f3b38;color:#ffffff;padding:18px 24px;font-weight:600;font-size:16px">lostandfound</td></tr>
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 16px;font-size:18px;line-height:1.4">${escapeHtml(row.subject)}</h1>
          <p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-line">${escapeHtml(row.body)}</p>
          ${
            link
              ? `<p style="margin:24px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#17736b;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Öffnen</a></p>`
              : ''
          }
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #f5f5f4;color:#78716c;font-size:12px">Schulprojekt M245 – automatisch versendet. Bitte nicht antworten.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

/** Gleicht das Secret zeitkonstant ab. */
export const secretMatches = (expected: string | undefined, given: string | null): boolean => {
  if (!expected || !given || expected.length !== given.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i)
  return diff === 0
}
