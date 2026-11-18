import { describe, expect, it } from 'vitest'
import { renameCsvHeader } from '../shared/csv'

describe('renameCsvHeader', () => {
  it('renames one cell of the first row', () => {
    expect(renameCsvHeader('A-ID,名稱,金額\nA-1,a,1\n', '名稱', '品名')).toBe('A-ID,品名,金額\nA-1,a,1\n')
  })

  it('reads quoted cells and quotes the new header when needed', () => {
    expect(renameCsvHeader('"a,b","say ""hi""",c\r\n1,2,3', 'say "hi"', 'x,y')).toBe('"a,b","x,y",c\r\n1,2,3')
    expect(renameCsvHeader('a,b\n', 'b', 'c "d"')).toBe('a,"c ""d"""\n')
  })

  it('reads only the first row', () => {
    expect(renameCsvHeader('a,b\nc,d\n', 'c', 'e')).toBeNull()
  })
})
