import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, filterCatalog, hasActiveFilters } from './catalog'
import { makeItem } from './testData'

const items = [
  makeItem({ id: '1', title: 'Kopfhörer', category: 'electronics', color: 'black', foundOn: '2026-10-01', organisationId: 'a' }),
  makeItem({ id: '2', title: 'Regenschirm', category: 'other', color: 'red', foundOn: '2026-10-05', organisationId: 'b', brand: 'Knirps' }),
  makeItem({ id: '3', title: 'Schlüsselbund', category: 'keys', color: 'multicolor', foundOn: '2026-10-09', organisationId: 'a' }),
]

describe('filterCatalog', () => {
  it('sortiert ohne Filter nach neuestem Fund', () => {
    expect(filterCatalog(items, EMPTY_FILTERS).map((i) => i.id)).toEqual(['3', '2', '1'])
  })

  it('sucht unabhängig von Gross-/Kleinschreibung und Umlaut-Akzenten in Titel und Marke', () => {
    expect(filterCatalog(items, { ...EMPTY_FILTERS, query: 'KNIRPS' }).map((i) => i.id)).toEqual(['2'])
    expect(filterCatalog(items, { ...EMPTY_FILTERS, query: 'schlussel' }).map((i) => i.id)).toEqual(['3'])
  })

  it('kombiniert Kategorie, Farbe, Organisation und Zeitraum', () => {
    expect(filterCatalog(items, { ...EMPTY_FILTERS, organisationId: 'a' }).map((i) => i.id)).toEqual(['3', '1'])
    expect(filterCatalog(items, { ...EMPTY_FILTERS, color: 'red' }).map((i) => i.id)).toEqual(['2'])
    expect(filterCatalog(items, { ...EMPTY_FILTERS, category: 'keys' }).map((i) => i.id)).toEqual(['3'])
    expect(filterCatalog(items, { ...EMPTY_FILTERS, foundFrom: '2026-10-02', foundTo: '2026-10-08' }).map((i) => i.id)).toEqual(['2'])
  })

  it('zeigt leere Liste, wenn nichts passt', () => {
    expect(filterCatalog(items, { ...EMPTY_FILTERS, query: 'Velo' })).toEqual([])
  })
})

describe('hasActiveFilters', () => {
  it('erkennt aktive Filter und kann Felder ignorieren', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, organisationId: 'a' }, ['organisationId'])).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, color: 'red' })).toBe(true)
  })
})
