import assert from 'node:assert/strict'
import { readMessages, runChat, searchItems, type CatalogSource, type PublicItem } from './chat.ts'
import { cleanDate } from './domain.ts'
import { buildBody, parseJsonObject, readConfig, type CompletionRequest, type CompletionResult, type LlmConfig } from './llm.ts'
import { createRateLimiter } from './ratelimit.ts'
import { cleanLossReport, cleanSearch, describeItemMessages, readDescribeItemInput } from './tasks.ts'

const config: LlmConfig = { apiKey: 'k', baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', visionModel: 'deepseek-flash' }

const item = (overrides: Partial<PublicItem>): PublicItem => ({
  id: 'i1',
  organisation_id: 'o1',
  item_number: 'BZS-2026-0001',
  title: 'Schwarzer Rucksack',
  category: 'bags',
  color: 'black',
  brand: 'Herschel',
  found_on: '2026-10-20',
  found_location: 'Mensa',
  public_description: 'Rucksack mit Laptopfach',
  photo_path: null,
  status: 'available',
  ...overrides,
})

Deno.test('Konfiguration: Standard ist DeepSeek, ohne Key keine KI', () => {
  assert.equal(readConfig(() => undefined), null)
  const c = readConfig((k) => (k === 'AI_API_KEY' ? 'x' : undefined))
  assert.deepEqual(c, { apiKey: 'x', baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', visionModel: 'deepseek-flash' })
})

Deno.test('DeepSeek-Denkmodus wird abgeschaltet, andere Anbieter erhalten kein Zusatzfeld', () => {
  const req: CompletionRequest = { messages: [{ role: 'user', content: 'x' }], json: true }
  assert.deepEqual(buildBody(config, req).thinking, { type: 'disabled' })
  assert.deepEqual(buildBody(config, req).response_format, { type: 'json_object' })
  assert.equal(buildBody({ ...config, baseUrl: 'https://api.openai.com/v1' }, req).thinking, undefined)
})

Deno.test('JSON wird auch aus Codeblöcken gelesen', () => {
  assert.deepEqual(parseJsonObject('```json\n{"a":1}\n```'), { a: 1 })
  assert.throws(() => parseJsonObject('kein json'))
})

Deno.test('Datum: nur gültig und nicht in der Zukunft', () => {
  assert.equal(cleanDate('2026-10-28', '2026-10-29'), '2026-10-28')
  assert.equal(cleanDate('2026-11-01', '2026-10-29'), null)
  assert.equal(cleanDate('gestern'), null)
})

Deno.test('Verlustmeldung: ungültige Werte der KI werden verworfen', () => {
  const draft = cleanLossReport(
    { title: '  Blaue Jacke ', category: 'jacken', color: 'blue', brand: null, lostOn: '2030-01-01', lostLocation: 'Bus 3' },
    '2026-10-29',
  )
  assert.equal(draft.title, 'Blaue Jacke')
  assert.equal(draft.category, null)
  assert.equal(draft.color, 'blue')
  assert.equal(draft.lostOn, null)
  assert.equal(draft.lostLocation, 'Bus 3')
})

Deno.test('Suche: nur bekannte Organisationen, ein Suchwort', () => {
  const orgs = [{ id: 'o1', name: 'Schule' }]
  const f = cleanSearch({ query: 'Rucksack schwarz', category: 'bags', organisationId: 'fremd', foundFrom: '2026-10-01' }, '2026-10-29', orgs)
  assert.equal(f.query, 'Rucksack')
  assert.equal(f.organisationId, '')
  assert.equal(f.category, 'bags')
  assert.equal(f.foundFrom, '2026-10-01')
})

Deno.test('Beschreibung: Titel ist Pflicht, interne Felder werden nie übernommen', () => {
  assert.equal(typeof readDescribeItemInput({}), 'string')
  const input = readDescribeItemInput({ title: 'Jacke', identifyingFeature: 'Name Lea im Kragen', storageLocation: 'Fach 2' })
  assert.notEqual(typeof input, 'string')
  const prompt = JSON.stringify(describeItemMessages(input as Exclude<typeof input, string>))
  assert.ok(!prompt.includes('Lea'))
  assert.ok(!prompt.includes('Fach 2'))
})

Deno.test('Katalogsuche ist grosszügig und filtert streng nach Kategorie', () => {
  const items = [item({}), item({ id: 'i2', title: 'Blaue Jacke', category: 'clothing', color: 'blue', brand: null, public_description: 'Regenjacke' }), item({ id: 'i3', status: 'returned' })]
  const names = new Map([['o1', 'Schule Seetal']])
  assert.deepEqual(searchItems(items, { keywords: 'Rucksack Laptop' }, names).map((i) => i.id), ['i1'])
  assert.deepEqual(searchItems(items, { category: 'clothing' }, names).map((i) => i.id), ['i2'])
  assert.deepEqual(searchItems(items, { keywords: 'seetal' }, names).map((i) => i.id), ['i1', 'i2'])
})

Deno.test('Chat: letzte Nachricht muss von der Person sein', () => {
  assert.equal(typeof readMessages([]), 'string')
  assert.equal(typeof readMessages([{ role: 'assistant', content: 'Hallo' }]), 'string')
  assert.deepEqual(readMessages([{ role: 'user', content: ' Hallo ' }]), [{ role: 'user', content: 'Hallo' }])
})

Deno.test('Chat: Werkzeugaufruf liefert Treffer ohne interne Angaben', async () => {
  const source: CatalogSource = {
    listItems: () => Promise.resolve([item({})]),
    listOrganisations: () => Promise.resolve([{ id: 'o1', slug: 's', name: 'Schule Seetal', address: 'Weg 1', office: null }]),
  }
  const seen: CompletionRequest[] = []
  const fake = (_c: LlmConfig, req: CompletionRequest): Promise<CompletionResult> => {
    seen.push(structuredClone(req))
    if (seen.length === 1) {
      return Promise.resolve({
        content: null,
        toolCalls: [{ id: 't1', type: 'function', function: { name: 'search_found_items', arguments: '{"keywords":"Rucksack"}' } }],
      })
    }
    return Promise.resolve({ content: 'Ich habe einen schwarzen Rucksack gefunden.', toolCalls: [] })
  }
  const result = await runChat(config, source, [{ role: 'user', content: 'Rucksack verloren' }], '2026-10-29', fake)
  assert.equal(result.reply, 'Ich habe einen schwarzen Rucksack gefunden.')
  assert.deepEqual(result.items.map((i) => i.id), ['i1'])
  const toolMessage = seen[1]!.messages.at(-1)!
  assert.equal(toolMessage.role, 'tool')
  assert.ok(String((toolMessage as { content: string }).content).includes('BZS-2026-0001'))
})

Deno.test('Rate-Limit sperrt nach dem Limit und gibt nach Ablauf frei', () => {
  let t = 0
  const allow = createRateLimiter(2, 1000, () => t)
  assert.ok(allow('a'))
  assert.ok(allow('a'))
  assert.ok(!allow('a'))
  assert.ok(allow('b'))
  t = 1500
  assert.ok(allow('a'))
})
