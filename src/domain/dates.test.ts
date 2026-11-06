import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, startOfWeek, todayIso } from './dates'

describe('Datum', () => {
  it('heute in Schweizer Zeit, nicht UTC', () => {
    expect(todayIso(new Date('2026-11-05T23:30:00Z'))).toBe('2026-11-06')
    expect(todayIso(new Date('2026-07-05T22:30:00Z'))).toBe('2026-07-06')
  })

  it('rechnet Tage ohne Zeitzonenfehler', () => {
    expect(addDays('2026-11-01', -3)).toBe('2026-10-29')
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
  })

  it('Montag der Woche', () => {
    expect(startOfWeek('2026-11-05')).toBe('2026-11-02')
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02')
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02')
  })
})
