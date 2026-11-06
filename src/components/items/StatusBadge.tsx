import { t } from '@/i18n/de-CH'
import type { ClaimStatus, ItemStatus, LossStatus } from '@/domain/types'
import { Badge } from '@/components/ui/Feedback'

const ITEM_TONES = { available: 'green', reserved: 'amber', returned: 'neutral', disposed: 'neutral' } as const
const CLAIM_TONES = { open: 'blue', confirmed: 'green', rejected: 'red', completed: 'neutral' } as const

export const ItemStatusBadge = ({ status }: { status: ItemStatus }) => <Badge tone={ITEM_TONES[status]}>{t.labels.itemStatus[status]}</Badge>
export const ClaimStatusBadge = ({ status }: { status: ClaimStatus }) => <Badge tone={CLAIM_TONES[status]}>{t.labels.claimStatus[status]}</Badge>
export const LossStatusBadge = ({ status }: { status: LossStatus }) => <Badge tone={status === 'open' ? 'blue' : 'neutral'}>{t.labels.lossStatus[status]}</Badge>
