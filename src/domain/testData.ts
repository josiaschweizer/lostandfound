import type { FoundItem } from './types'

export const makeItem = (overrides: Partial<FoundItem> = {}): FoundItem => ({
  id: 'item-1',
  organisationId: 'org-a',
  itemNumber: 'ABC-2026-0001',
  title: 'Rucksack',
  category: 'bags',
  color: 'black',
  brand: null,
  foundOn: '2026-10-10',
  foundLocation: 'Bahnhof',
  publicDescription: '',
  photoPath: null,
  status: 'available',
  isPublic: true,
  createdAt: '2026-10-10T10:00:00Z',
  ...overrides,
})
