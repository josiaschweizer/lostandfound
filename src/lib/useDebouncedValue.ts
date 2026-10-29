import { useEffect, useState } from 'react'

/** Liefert `value` erst, wenn er sich `delayMs` lang nicht mehr geändert hat (z. B. Tippen im Suchfeld). */
export const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
