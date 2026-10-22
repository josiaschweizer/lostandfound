import { describe, expect, it } from 'vitest'
import { allowedItemStatuses, canConfirmRequest, canRejectRequest, pendingAfterReturn } from './workflow'

describe('Anfragen', () => {
  it('bestätigt nur offene Anfragen ohne andere bestätigte Anfrage', () => {
    expect(canConfirmRequest({ status: 'open' }, 'available', [])).toBe(true)
    expect(canConfirmRequest({ status: 'open' }, 'available', [{ status: 'confirmed' }])).toBe(false)
    expect(canConfirmRequest({ status: 'open' }, 'returned', [])).toBe(false)
    expect(canConfirmRequest({ status: 'rejected' }, 'available', [])).toBe(false)
  })

  it('lehnt offene und bestätigte Anfragen ab, abgeschlossene nicht', () => {
    expect(canRejectRequest({ status: 'open' })).toBe(true)
    expect(canRejectRequest({ status: 'confirmed' })).toBe(true)
    expect(canRejectRequest({ status: 'completed' })).toBe(false)
  })
})

describe('Gegenstandsstatus', () => {
  it('erlaubt «Verfügbar» nicht, solange eine Anfrage bestätigt ist', () => {
    expect(allowedItemStatuses('reserved', [{ status: 'confirmed' }])).toEqual(['returned'])
    expect(allowedItemStatuses('reserved', [])).toEqual(['available', 'returned'])
    expect(allowedItemStatuses('available', [{ status: 'open' }])).toEqual(['reserved', 'returned'])
  })

  it('meldet offene Anfragen nach einer Rückgabe', () => {
    const requests = [{ status: 'open' as const }, { status: 'completed' as const }]
    expect(pendingAfterReturn('returned', requests)).toHaveLength(1)
    expect(pendingAfterReturn('reserved', requests)).toHaveLength(0)
  })
})
