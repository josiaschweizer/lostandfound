import assert from 'node:assert/strict'

const assertEquals = (actual: unknown, expected: unknown): void => assert.equal(actual, expected)
const assertStringIncludes = (text: string, part: string): void => assert.ok(text.includes(part), part)
import { buildHtml, buildLink, secretMatches, type EmailRow } from './email.ts'

const row: EmailRow = { id: '1', recipient: 'a@b.ch', subject: 'Test <b>', body: 'Hallo & Tschüss', link_path: '/verlust/x', delivery_status: 'pending' }

Deno.test('baut absolute Links', () => {
  assertEquals(buildLink('http://localhost:5173/', '/verlust/x'), 'http://localhost:5173/verlust/x')
  assertEquals(buildLink('https://app.ch', null), null)
})

Deno.test('escaped HTML im Betreff und Text', () => {
  const html = buildHtml(row, 'https://app.ch/verlust/x')
  assertStringIncludes(html, 'Test &lt;b&gt;')
  assertStringIncludes(html, 'Hallo &amp; Tschüss')
  assertStringIncludes(html, 'href="https://app.ch/verlust/x"')
})

Deno.test('prüft das Secret', () => {
  assertEquals(secretMatches('abc', 'abc'), true)
  assertEquals(secretMatches('abc', 'abd'), false)
  assertEquals(secretMatches(undefined, 'abc'), false)
  assertEquals(secretMatches('abc', null), false)
})
