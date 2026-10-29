import type { ItemCategory, ItemColor, ItemStatus, LossReportStatus, OrganisationType, RequestStatus } from './types'

export const ORGANISATION_TYPE_LABELS: Record<OrganisationType, string> = {
  school: 'Schule',
  lost_property_office: 'Fundbüro',
  company: 'Unternehmen',
  other: 'Andere Organisation',
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  electronics: 'Elektronik',
  clothing: 'Kleidung',
  keys: 'Schlüssel',
  bags: 'Taschen & Rucksäcke',
  wallets: 'Portemonnaies & Ausweise',
  jewellery: 'Schmuck & Uhren',
  sports: 'Sport & Freizeit',
  other: 'Sonstiges',
}

export const COLOR_LABELS: Record<ItemColor, string> = {
  black: 'Schwarz',
  white: 'Weiss',
  grey: 'Grau',
  blue: 'Blau',
  red: 'Rot',
  green: 'Grün',
  yellow: 'Gelb',
  brown: 'Braun',
  pink: 'Rosa',
  gold: 'Gold',
  silver: 'Silber',
  multicolor: 'Mehrfarbig',
  other: 'Andere Farbe',
}

export const COLOR_SWATCHES: Record<ItemColor, string> = {
  black: '#1f2328',
  white: '#ffffff',
  grey: '#8b929a',
  blue: '#2f6fdb',
  red: '#d33b3b',
  green: '#2e9d5b',
  yellow: '#e8c232',
  brown: '#8a5a35',
  pink: '#e58bb3',
  gold: '#c9a227',
  silver: '#c4c9cf',
  multicolor: 'conic-gradient(#d33b3b, #e8c232, #2e9d5b, #2f6fdb, #d33b3b)',
  other: '#d9dde1',
}

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  available: 'Verfügbar',
  reserved: 'Reserviert',
  returned: 'Zurückgegeben',
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Offen',
  confirmed: 'Bestätigt',
  rejected: 'Abgelehnt',
  completed: 'Abgeschlossen',
}

export const LOSS_REPORT_STATUS_LABELS: Record<LossReportStatus, string> = {
  open: 'Offen',
  closed: 'Erledigt',
}

export const toOptions = <K extends string>(labels: Record<K, string>) =>
  (Object.entries(labels) as [K, string][]).map(([value, label]) => ({ value, label }))
