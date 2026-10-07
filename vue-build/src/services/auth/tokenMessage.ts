// token 裡的 message：{ user, exp }，以 base64url 編碼（格式見 docs/auth.md）。
// 正式流程裡前端不解析 token，只有假後端會用到這裡

export interface TokenMessage {
  user: string
  // 秒
  exp: number
}

export function encodeMessage (message: TokenMessage): string {
  const bytes = new TextEncoder().encode(JSON.stringify(message))
  return btoa(String.fromCodePoint(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

// 解不開就是 null。簽章（'.' 後面那段）不看，只讀前面的 message
export function decodeMessage (token: string): TokenMessage | null {
  try {
    const base64 = token.split('.', 1)[0]!.replaceAll('-', '+').replaceAll('_', '/')
    const bytes = Uint8Array.from(atob(base64), char => char.codePointAt(0)!)
    return JSON.parse(new TextDecoder().decode(bytes)) as TokenMessage
  } catch {
    return null
  }
}
