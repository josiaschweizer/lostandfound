import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { Button } from '@/components/ui/Button'

export const CopyLink = ({ path }: { path: string }) => {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}${path}`
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 rounded-xl bg-stone-100 px-3 py-2.5 text-sm break-all">{url}</code>
      <Button
        variant="secondary"
        size="sm"
        icon={copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => setCopied(true))
        }}
      >
        {copied ? t.common.copied : t.common.copy}
      </Button>
    </div>
  )
}
