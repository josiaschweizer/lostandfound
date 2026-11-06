import { t } from '@/i18n/de-CH'

/** Reihenfolge, in der Begründungen angezeigt werden (stärkste zuerst). */
const ORDER = ['marke_gleich', 'farbe_gleich', 'stichwort', 'farbe_aehnlich', 'ort', 'datum_nah']

/** Wandelt Begründungs-Kürzel aus dem Matching in 1–3 Chips in Alltagssprache um (KONZEPT 6.5). */
export const reasonLabels = (reasons: readonly string[], max = 3): string[] => {
  const labels = t.labels.reasons
  const sorted = [...reasons].sort((a, b) => ORDER.indexOf(a.split(':')[0] ?? a) - ORDER.indexOf(b.split(':')[0] ?? b))
  const result: string[] = []
  for (const reason of sorted) {
    const [code, word] = reason.split(':')
    if (code === 'stichwort' && word) {
      if (result.some((label) => label.startsWith('Wort:'))) continue
      result.push(labels.stichwort(word))
    } else if (code && code in labels && code !== 'stichwort') {
      result.push(labels[code as Exclude<keyof typeof labels, 'stichwort'>])
    }
    if (result.length >= max) break
  }
  return result
}
