import { describe, expect, it } from 'vitest'
import { t } from './de-CH'

/** Sammelt alle Texte (auch aus Arrays und Funktionen mit Beispielwerten). */
const collect = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (typeof value === 'function') return [String(value(1)), String(value(2))]
  if (Array.isArray(value)) return value.flatMap(collect)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collect)
  return []
}

describe('Texte de-CH', () => {
  const texts = collect(t)

  it('enthält Texte', () => {
    expect(texts.length).toBeGreaterThan(20)
  })

  it('verwendet kein «ß» (Schweizer Rechtschreibung)', () => {
    expect(texts.filter((text) => text.includes('ß'))).toEqual([])
  })

  it('verwendet keine deutschen Anführungszeichen „“', () => {
    expect(texts.filter((text) => /[„“]/.test(text))).toEqual([])
  })

  it('enthält keine Begriffe, die laut Wording-Tabelle entfallen', () => {
    const banned = /Eigentumsnachweis|KI-Abgleich|KI-Suche|Organisation registrieren|Fragen\?/
    expect(texts.filter((text) => banned.test(text))).toEqual([])
  })
})
