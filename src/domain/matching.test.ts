import { describe, expect, it } from 'vitest'
import { extractKeywords, findMatches, type MatchCriteria } from './matching'
import { makeItem } from './testData'

const criteria: MatchCriteria = {
  organisationId: null,
  title: 'Schwarzer Rucksack',
  category: 'bags',
  color: 'black',
  brand: 'Fjällräven',
  lostOn: '2026-10-05',
  description: 'Mit Laptopfach',
}

describe('findMatches', () => {
  it('verlangt gleiche Kategorie', () => {
    const result = findMatches(criteria, [makeItem({ category: 'clothing' })])
    expect(result).toHaveLength(0)
  })

  it('akzeptiert Funde am Verlusttag und bis 30 Tage danach', () => {
    const items = [
      makeItem({ id: 'same-day', foundOn: '2026-10-05' }),
      makeItem({ id: 'day-30', foundOn: '2026-11-04' }),
      makeItem({ id: 'day-31', foundOn: '2026-11-05' }),
      makeItem({ id: 'before', foundOn: '2026-10-04' }),
    ]
    expect(findMatches(criteria, items).map((m) => m.item.id).sort()).toEqual(['day-30', 'same-day'])
  })

  it('schliesst zurückgegebene Gegenstände aus', () => {
    expect(findMatches(criteria, [makeItem({ status: 'returned' })])).toHaveLength(0)
  })

  it('beschränkt auf die gewählte Organisation', () => {
    const items = [makeItem({ id: 'a', organisationId: 'org-a' }), makeItem({ id: 'b', organisationId: 'org-b' })]
    expect(findMatches({ ...criteria, organisationId: 'org-b' }, items).map((m) => m.item.id)).toEqual(['b'])
  })

  it('rangiert Farbe und gemeinsame Stichworte', () => {
    const items = [
      makeItem({ id: 'other-color', color: 'red', title: 'Rucksack' }),
      makeItem({ id: 'best', color: 'black', brand: 'Fjällräven', publicDescription: 'Rucksack mit Laptopfach' }),
      makeItem({ id: 'color-only', color: 'black', title: 'Tasche' }),
    ]
    const result = findMatches(criteria, items)
    expect(result.map((m) => m.item.id)).toEqual(['best', 'color-only', 'other-color'])
    expect(result[0]?.score).toBe(2 + 3)
    expect(result[0]?.sharedKeywords).toEqual(['fjällräven', 'laptopfach', 'rucksack'])
  })
})

describe('extractKeywords', () => {
  it('ignoriert Füllwörter, kurze Wörter und Gross-/Kleinschreibung', () => {
    expect([...extractKeywords('Ein roter Schirm mit Griff', null)]).toEqual(['roter', 'schirm', 'griff'])
  })
})
