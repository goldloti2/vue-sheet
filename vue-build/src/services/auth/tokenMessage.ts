// token 中的 message：{ user, exp }，以 base64url 編碼（見 docs/auth.md）。只有假後端使用此處

interface TokenMessage {
  user: string
  // 單位為秒
  exp: number
}

export function encodeMessage (message: TokenMessage): string {
  const bytes = new TextEncoder().encode(JSON.stringify(message))
  return btoa(String.fromCodePoint(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

// 無法解碼時為 null。不檢查簽章（'.' 之後），只讀取之前的 message
export function decodeMessage (token: string): TokenMessage | null {
  try {
    const base64 = token.split('.', 1)[0]!.replaceAll('-', '+').replaceAll('_', '/')
    const bytes = Uint8Array.from(atob(base64), char => char.codePointAt(0)!)
    return JSON.parse(new TextDecoder().decode(bytes)) as TokenMessage
  } catch {
    return null
  }
}
