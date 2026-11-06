import { describe, expect, it } from 'vitest'
import { imageSrc } from '@/schema/image'

const ID = '1AbCdEfGhIjKlMn'

describe('imageSrc', () => {
  it('不是字串或為空白時為 null', () => {
    expect(imageSrc(null)).toBeNull()
    expect(imageSrc('  ')).toBeNull()
  })

  it('行內 SVG 轉為 data: URI', () => {
    expect(imageSrc('<svg viewBox="0 0 1 1"></svg>')).toBe(`data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 1 1"></svg>')}`)
  })

  it('一般的網址原樣使用', () => {
    expect(imageSrc('https://example.com/a.png')).toBe('https://example.com/a.png')
  })

  it('Drive 的分享連結與檔案 id 轉為縮圖端點', () => {
    const thumbnail = `https://drive.google.com/thumbnail?id=${ID}&sz=w400`
    expect(imageSrc(`https://drive.google.com/file/d/${ID}/view?usp=sharing`)).toBe(thumbnail)
    expect(imageSrc(`https://drive.google.com/open?id=${ID}`)).toBe(thumbnail)
    expect(imageSrc(ID)).toBe(thumbnail)
    expect(imageSrc(ID, 120)).toBe(`https://drive.google.com/thumbnail?id=${ID}&sz=w120`)
  })
})
