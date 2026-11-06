import { describe, expect, it } from 'vitest'
import { parseCsv } from '@/services/mock/csv'

describe('parseCsv', () => {
  it('第一行為表頭，每一行轉為 { 表頭: 字串 }', () => {
    expect(parseCsv('a,b\n1,2\n3,4\n')).toEqual([{ a: '1', b: '2' }, { a: '3', b: '4' }])
  })

  it('缺少的格為空字串', () => {
    expect(parseCsv('a,b\n1')).toEqual([{ a: '1', b: '' }])
  })

  it('引號內的逗號、換行與 "" 屬於值', () => {
    expect(parseCsv('a,b\n"x,y","第一行\n第二行"\n"say ""hi""",z')).toEqual([
      { a: 'x,y', b: '第一行\n第二行' },
      { a: 'say "hi"', b: 'z' },
    ])
  })

  it('接受 CRLF 的換行', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([{ a: '1', b: '2' }])
  })
})
