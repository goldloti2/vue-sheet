// CSV 解析，只供 mock 後端使用

// 逐字切出各行各格。引號內的逗號與換行屬於值
function splitCsv (text: string): string[][] {
  const lines: string[][] = []
  let values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else {
      switch (char) {
        case '"': {
          inQuotes = true

          break
        }
        case ',': {
          values.push(current)
          current = ''

          break
        }
        case '\n':
        case '\r': {
          if (char === '\r' && text[i + 1] === '\n') {
            i++
          }
          values.push(current)
          lines.push(values)
          values = []
          current = ''

          break
        }
        default: {
          current += char
        }
      }
    }
  }
  values.push(current)
  lines.push(values)
  return lines
}

// 第一行為表頭，回傳 { 表頭: 原始字串 } 的陣列，形狀與真後端讀取 Sheet 的結果相同
export function parseCsv (text: string): Record<string, string>[] {
  const [headers = [], ...lines] = splitCsv(text.trim())
  return lines.map(values => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])))
}
