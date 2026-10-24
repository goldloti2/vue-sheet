// CSV 解析，只供 mock 後端使用

function splitCsvLine (line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)
  return values
}

// 第一行為表頭，回傳 { 表頭: 原始字串 } 的陣列，形狀與真後端讀取 Sheet 的結果相同
export function parseCsv (text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    return Object.fromEntries(headers.map((header, i) => [header, values[i] ?? '']))
  })
}
