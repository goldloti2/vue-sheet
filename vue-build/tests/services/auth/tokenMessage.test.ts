import { describe, expect, it } from 'vitest'
import { decodeMessage, encodeMessage } from '@/services/auth/tokenMessage'

describe('encodeMessage 與 decodeMessage', () => {
  it('互為反函數，含中文的名稱也相同', () => {
    const message = { user: '使用者', exp: 1_900_000_000 }
    expect(decodeMessage(encodeMessage(message))).toEqual(message)
  })

  it('編碼為 base64url，不含 +、/ 與結尾的 =', () => {
    expect(encodeMessage({ user: '>>>???', exp: 1 })).toMatch(/^[\w-]+$/)
  })

  it('只讀取 . 之前的部分，忽略簽章', () => {
    const token = `${encodeMessage({ user: 'a', exp: 1 })}.簽章`
    expect(decodeMessage(token)).toEqual({ user: 'a', exp: 1 })
  })

  it('無法解碼時為 null', () => {
    expect(decodeMessage('!!!')).toBeNull()
    expect(decodeMessage(btoa('not json'))).toBeNull()
  })
})
