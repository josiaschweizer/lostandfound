import { useId, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { t } from '@/i18n/de-CH'
import { extractFields, type ExtractedFields } from '@/services/ai'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Form'
import { useAiFeature } from './useAiStatus'

/**
 * Einziger sichtbarer KI-Einstieg pro Formular (KONZEPT 7.2): Freitext → Felder.
 * Wird nur gezeigt, wenn die KI eingeschaltet ist. Das Formular entscheidet selbst, welche
 * (leeren) Felder es übernimmt.
 */
export const AiFillBox = ({
  context,
  onFilled,
}: {
  context: 'verlust' | 'fund'
  /** Liefert die Namen der tatsächlich gefüllten Felder zurück. */
  onFilled: (fields: ExtractedFields) => string[]
}) => {
  const enabled = useAiFeature('extract_fields')
  const [text, setText] = useState('')
  const [result, setResult] = useState<'filled' | 'nothing' | null>(null)
  const id = useId()
  const mutation = useMutation({
    mutationFn: () => extractFields(text, context),
    onSuccess: (fields) => setResult(onFilled(fields).length > 0 ? 'filled' : 'nothing'),
  })

  if (!enabled) return null
  return (
    <div className="space-y-3 rounded-3xl bg-brand-50/70 p-4 ring-1 ring-brand-100 sm:p-5" data-testid="ai-box">
      <label htmlFor={id} className="flex items-center gap-2 font-semibold text-stone-900">
        <Sparkles className="size-5 text-brand-600" aria-hidden />
        {t.ai.boxTitle}
      </label>
      <Textarea
        id={id}
        rows={3}
        maxLength={500}
        value={text}
        placeholder={context === 'verlust' ? t.ai.boxPlaceholderLoss : t.ai.boxPlaceholderItem}
        onChange={(event) => {
          setText(event.target.value)
          setResult(null)
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" icon={<Sparkles className="size-4 text-brand-600" aria-hidden />} loading={mutation.isPending} disabled={text.trim().length < 5} onClick={() => mutation.mutate()}>
          {mutation.isPending ? t.ai.working : t.ai.button}
        </Button>
        {result === 'nothing' && <p className="text-sm text-stone-700">{t.ai.nothingFilled}</p>}
      </div>
      {mutation.isError && <p className="text-sm font-medium text-red-700" role="alert">{t.ai.failed}</p>}
      <p className="text-sm text-stone-600">{context === 'verlust' ? t.ai.boxHint : t.ai.boxHintStaff} {t.ai.privacy}</p>
    </div>
  )
}
