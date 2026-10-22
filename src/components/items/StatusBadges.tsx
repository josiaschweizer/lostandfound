import { ITEM_STATUS_LABELS, LOSS_REPORT_STATUS_LABELS, REQUEST_STATUS_LABELS } from '@/domain/labels'
import type { ItemStatus, LossReportStatus, RequestStatus } from '@/domain/types'
import { Badge } from '../ui/Layout'

const ITEM_TONES = { available: 'green', reserved: 'amber', returned: 'neutral' } as const
const REQUEST_TONES = { open: 'blue', confirmed: 'green', rejected: 'red', completed: 'neutral' } as const

export const ItemStatusBadge = ({ status }: { status: ItemStatus }) => <Badge tone={ITEM_TONES[status]}>{ITEM_STATUS_LABELS[status]}</Badge>

export const RequestStatusBadge = ({ status }: { status: RequestStatus }) => <Badge tone={REQUEST_TONES[status]}>{REQUEST_STATUS_LABELS[status]}</Badge>

export const LossReportStatusBadge = ({ status }: { status: LossReportStatus }) => (
  <Badge tone={status === 'open' ? 'blue' : 'neutral'}>{LOSS_REPORT_STATUS_LABELS[status]}</Badge>
)
