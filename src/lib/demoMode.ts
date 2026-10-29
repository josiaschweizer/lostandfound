/**
 * Demo-Hilfe ein-/ausblenden: lokal (pnpm dev) immer sichtbar, online nur nach Aufruf mit «?demo=1».
 * «?demo=0» blendet sie wieder aus. Die Wahl wird im Browser gespeichert.
 */
const KEY = 'lostandfound:demo'

export const resolveDemoMode = (search: string): boolean => {
  const param = new URLSearchParams(search).get('demo')
  try {
    if (param === '1') localStorage.setItem(KEY, '1')
    if (param === '0') localStorage.removeItem(KEY)
    return import.meta.env.DEV ? param !== '0' : localStorage.getItem(KEY) === '1'
  } catch {
    return import.meta.env.DEV || param === '1'
  }
}
