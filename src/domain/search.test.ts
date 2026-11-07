import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, normalize, searchCatalog, searchTerms, stem } from './search'
import type { PublicItem } from './types'

const item = (over: Partial<PublicItem>): PublicItem => ({
  id: over.title ?? 'x',
  organisationId: 'o1',
  itemNumber: 'BSM-2026-0001',
  title: 'Rucksack',
  category: 'bags',
  colors: ['black'],
  brand: null,
  foundOn: '2026-11-01',
  foundLocation: 'Mensa',
  publicDescription: '',
  photoPath: null,
  status: 'available',
  createdAt: '2026-11-01T10:00:00Z',
  ...over,
})

const ITEMS = [
  item({ id: '1', title: 'Regenjacke', category: 'clothing', colors: ['blue'], foundOn: '2026-11-02' }),
  item({ id: '2', title: 'Winterjacke', category: 'clothing', colors: ['blue'], foundOn: '2026-11-03' }),
  item({ id: '3', title: 'Kabellose Ohrhörer', category: 'electronics', colors: ['white'], brand: 'Apple' }),
  item({ id: '4', title: 'Rucksack', colors: ['black'], foundLocation: 'Restaurant Savanne' }),
  item({ id: '5', title: 'Brotdose', category: 'other', colors: ['blue'] }),
  item({ id: '6', title: 'Daunenjacke', category: 'clothing', colors: ['red'], organisationId: 'o2' }),
]
const SYNONYMS = [['Jacke', 'Winterjacke', 'Regenjacke', 'Mantel'], ['Kopfhörer', 'Ohrhörer', 'AirPods'], ['Ausweis', 'ID', 'Karte']]
const office = () => 'Berufsschule Musterstadt'

describe('Suche', () => {
  it('normalisiert Umlaute und Gross-/Kleinschreibung (ä = ae)', () => {
    expect(normalize('Kopfhörer GRÜN')).toBe('kopfhoerer gruen')
    expect(searchCatalog(ITEMS, { ...EMPTY_FILTERS, query: 'ohrhoerer' }, office).results.map((i) => i.id)).toEqual(['3'])
    expect(searchCatalog(ITEMS, { ...EMPTY_FILTERS, query: 'OHRHÖRER' }, office).results.map((i) => i.id)).toEqual(['3'])
  })

  it('kürzt einfache Pluralformen', () => {
    expect(stem('jacken')).toBe('jack')
    expect(stem('jacke')).toBe('jack')
    expect(searchCatalog(ITEMS, { ...EMPTY_FILTERS, query: 'Jacken' }, office).results.map((i) => i.id)).toEqual(['2', '1', '6'])
  })

  it('findet über Farbe, Marke, Fundort und Fundstelle', () => {
    expect(searchCatalog(ITEMS, { ...EMPTY_FILTERS, query: 'blaue jacke' }, office).results.map((i) => i.id)).toEqual(['2', '1'])
    expect(searchCatalog(ITEMS, { ...EMPTY_FILTERS, query: 'apple' }, office).results.map((i) => i.id)).toEqual(['3'])
    expect(searchCatalog(ITEMS, { ...EMPTY_FILTERS, query: 'savanne' }, office).results.map((i) => i.id)).toEqual(['4'])
  })

  it('kurze Wörter nur am Wortanfang («rot» findet nicht «Brotdose»)', () => {
    expect(searchCatalog(ITEMS, { ...EMPTY_FILTERS, query: 'rot' }, office).results.map((i) => i.id)).toEqual(['6'])
  })

  it('filtert nach Kategorie, mehreren Farben, Zeitraum und Fundstelle', () => {
    const run = (filters: Partial<typeof EMPTY_FILTERS>) => searchCatalog(ITEMS, { ...EMPTY_FILTERS, ...filters }, office).results.map((i) => i.id)
    expect(run({ category: 'clothing' })).toEqual(['2', '1', '6'])
    expect(run({ colors: ['white', 'red'] })).toEqual(['3', '6'])
    expect(run({ from: '2026-11-02' })).toEqual(['2', '1'])
    expect(run({ officeId: 'o2' })).toEqual(['6'])
  })

  it('«Winterjacke» + Blau findet die blauen Jacken mindestens unter «Ähnliche Gegenstände» (AK 5.2)', () => {
    const result = searchCatalog(ITEMS, { ...EMPTY_FILTERS, query: 'Winterjacke', colors: ['blue'] }, office, SYNONYMS)
    expect(result.results.map((i) => i.id)).toEqual(['2'])
    expect(result.similar.map((i) => i.id)).toEqual(['1'])
    expect(result.alsoSearched).toContain('Jacke')
  })

  it('erweitert nur bei weniger als 3 Treffern', () => {
    const result = searchCatalog(ITEMS, { ...EMPTY_FILTERS, query: 'AirPods' }, office, SYNONYMS)
    expect(result.results).toHaveLength(0)
    expect(result.similar.map((i) => i.id)).toEqual(['3'])
  })

  it('Suchwörter ohne Füllwörter', () => {
    expect(searchTerms('Ich habe meine schwarze Jacke verloren')).toEqual(['schwarze', 'jacke'])
  })

  it('nutzt KI-Begriffe nur, wenn Suche und Synonyme zu wenig finden', () => {
    const query = { ...EMPTY_FILTERS, query: 'Ding für Musik' }
    expect(searchCatalog(ITEMS, query, office, SYNONYMS).similar).toEqual([])
    const withAi = searchCatalog(ITEMS, query, office, SYNONYMS, ['Kopfhörer', 'Ohrhörer'])
    expect(withAi.similar.map((i) => i.id)).toEqual(['3'])
    expect(withAi.viaAi).toBe(true)
    expect(withAi.alsoSearched).toEqual(['Kopfhörer', 'Ohrhörer'])
    // genug normale Treffer: KI-Begriffe werden ignoriert
    const jacket = searchCatalog(ITEMS, { ...EMPTY_FILTERS, query: 'jacke' }, office, SYNONYMS, ['Brotdose'])
    expect(jacket.viaAi).toBe(false)
  })
})
