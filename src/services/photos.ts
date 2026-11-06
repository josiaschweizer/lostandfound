import { supabase } from '@/lib/supabase'
import { unwrap } from './errors'

const BUCKET = 'item-photos'
const MAX_EDGE = 1600

/** Bilder der Demo-Daten liegen als statische Dateien in public/demo-photos/ (photo_path «demo/<datei>»). */
export const DEMO_PREFIX = 'demo/'
export const isDemoPhoto = (path: string | null): boolean => Boolean(path?.startsWith(DEMO_PREFIX))

export const photoUrl = (path: string | null): string | null => {
  if (!path) return null
  if (isDemoPhoto(path)) return `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}demo-photos/${path.slice(DEMO_PREFIX.length)}`
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * Verkleinert auf max. 1600 px und speichert neu als JPEG. Dabei gehen EXIF-Daten
 * (z. B. GPS-Position) verloren – gewollt (KONZEPT 8.3).
 */
export const downscaleImage = async (file: Blob, maxEdge = MAX_EDGE, quality = 0.85): Promise<Blob> => {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Bild konnte nicht verarbeitet werden.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Bild konnte nicht verarbeitet werden.'))), 'image/jpeg', quality),
    )
  } finally {
    bitmap.close()
  }
}

export const uploadPhoto = async (organisationId: string, file: File): Promise<string> => {
  const blob = await downscaleImage(file)
  const path = `${organisationId}/${crypto.randomUUID()}.jpg`
  unwrap(await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' }))
  return path
}

/** Ersetzte oder entfernte Fotos löschen, damit keine verwaisten Dateien liegen bleiben. */
export const deletePhoto = async (path: string): Promise<void> => {
  if (isDemoPhoto(path)) return
  await supabase.storage.from(BUCKET).remove([path])
}
