import { supabase } from '@/lib/supabase'
import { unwrap } from './errors'

const BUCKET = 'item-photos'
const MAX_EDGE = 1600

export const photoUrl = (path: string | null): string | null =>
  path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null

const downscale = async (file: File): Promise<Blob> => {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Bild konnte nicht verarbeitet werden.'))), 'image/jpeg', 0.85),
  )
}

export const uploadPhoto = async (organisationId: string, file: File): Promise<string> => {
  const blob = await downscale(file)
  const path = `${organisationId}/${crypto.randomUUID()}.jpg`
  unwrap(await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' }))
  return path
}
