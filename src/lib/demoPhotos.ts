/**
 * Bilder der Beispieldaten liegen als statische Dateien in public/demo-photos/
 * (erzeugt mit scripts/demo-photos/generate.py). In der Datenbank steht dafür
 * photo_path = «demo/<datei>». Hochgeladene Fotos liegen dagegen in Supabase Storage.
 */
const DEMO_PREFIX = 'demo/'

export const isDemoPhoto = (path: string): boolean => path.startsWith(DEMO_PREFIX)

export const demoPhotoUrl = (path: string, baseUrl: string = import.meta.env.BASE_URL): string =>
  `${baseUrl.replace(/\/?$/, '/')}demo-photos/${path.slice(DEMO_PREFIX.length)}`
