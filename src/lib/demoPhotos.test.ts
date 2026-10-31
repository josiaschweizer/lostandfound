import { describe, expect, it } from 'vitest'
import { demoPhotoUrl, isDemoPhoto } from './demoPhotos'

describe('demoPhotos', () => {
  it('erkennt Beispielbilder am Präfix', () => {
    expect(isDemoPhoto('demo/bzs-rucksack-grau.webp')).toBe(true)
    expect(isDemoPhoto('0b5c…/a1b2.jpg')).toBe(false)
  })

  it('verweist auf die statische Datei, auch mit Unterpfad', () => {
    expect(demoPhotoUrl('demo/bzs-rucksack-grau.webp', '/')).toBe('/demo-photos/bzs-rucksack-grau.webp')
    expect(demoPhotoUrl('demo/x.webp', '/app')).toBe('/app/demo-photos/x.webp')
  })
})
