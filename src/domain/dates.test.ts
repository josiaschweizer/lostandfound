import { describe, expect, it } from 'vitest'
import { daysBetween, formatRelativeDay, todayIso } from './dates'

describe('dates', () => {
  it('rechnet Tage zeitzonensicher', () => {
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2) // Sommerzeit-Wechsel
    expect(daysBetween('2026-10-05', '2026-10-04')).toBe(-1)
  })
  it('formatiert das lokale Datum', () => {
    expect(todayIso(new Date(2026, 0, 9))).toBe('2026-01-09')
  })
  it('formatiert relative Tage', () => {
    expect(formatRelativeDay('2026-10-22', '2026-10-22')).toBe('Heute')
    expect(formatRelativeDay('2026-10-21', '2026-10-22')).toBe('Gestern')
    expect(formatRelativeDay('2026-10-17', '2026-10-22')).toBe('Vor 5 Tagen')
    expect(formatRelativeDay('2026-09-01', '2026-10-22')).toContain('2026')
  })
})
