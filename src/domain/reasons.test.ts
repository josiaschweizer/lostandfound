import { describe, expect, it } from 'vitest'
import { reasonLabels } from './reasons'

describe('Begründungen', () => {
  it('zeigt höchstens 3 Chips in Alltagssprache, stärkste zuerst', () => {
    expect(reasonLabels(['datum_nah', 'farbe_gleich', 'stichwort:Kopfhörer', 'stichwort:Etui', 'marke_gleich', 'ort'])).toEqual([
      'Marke stimmt',
      'Farbe stimmt',
      'Wort: Kopfhörer',
    ])
  })

  it('übersetzt alle Kürzel', () => {
    expect(reasonLabels(['farbe_aehnlich', 'ort', 'datum_nah'])).toEqual(['Ähnliche Farbe', 'Ort passt', 'Zeitlich nah'])
  })

  it('ignoriert unbekannte Kürzel', () => {
    expect(reasonLabels(['unbekannt'])).toEqual([])
  })
})
