/**
 * Verkleinert ein Bild im Browser und liefert es als JPEG-Data-URL.
 * So gehen nur wenige hundert Kilobyte an die KI statt eines Handyfotos mit mehreren Megabyte.
 */
export const imageToDataUrl = async (source: Blob, maxSize = 1024, quality = 0.8): Promise<string> => {
  const bitmap = await createImageBitmap(source)
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Bild konnte nicht verarbeitet werden.')
    // Weisser Hintergrund für transparente PNGs.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    bitmap.close()
  }
}
