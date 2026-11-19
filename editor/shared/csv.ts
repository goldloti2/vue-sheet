// CSV 的解析與表頭（第一列）。格可以雙引號括住，引號中的 "" 為一個引號，引號中可以有逗號與換行

interface HeaderCell {
  from: number
  to: number
  value: string
}

// 第一列各格的範圍與值
function headerCells (text: string): HeaderCell[] {
  const cells: HeaderCell[] = []
  let pos = 0
  while (pos <= text.length) {
    const from = pos
    let value = ''
    if (text[pos] === '"') {
      pos++
      while (pos < text.length && !(text[pos] === '"' && text[pos + 1] !== '"')) {
        value += text[pos]
        pos += text[pos] === '"' ? 2 : 1
      }
      pos++
    }
    while (pos < text.length && text[pos] !== ',' && text[pos] !== '\n' && text[pos] !== '\r') {
      value += text[pos]
      pos++
    }
    cells.push({ from, to: pos, value })
    if (text[pos] !== ',') {
      break
    }
    pos++
  }
  return cells
}

function cellText (value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/** 一列的原文，結尾有換行 */
export function csvRowText (values: readonly string[]): string {
  return `${values.map(value => cellText(value)).join(',')}\n`
}

/** 各列各格的值，第一列為表頭。結尾的換行不算一列 */
export function parseCsv (text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        value += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        value += char
      }
    } else {
      switch (char) {
        case '"': {
          quoted = true

          break
        }
        case ',': {
          row.push(value)
          value = ''

          break
        }
        case '\n':
        case '\r': {
          if (char === '\r' && text[i + 1] === '\n') {
            i++
          }
          rows.push([...row, value])
          row = []
          value = ''

          break
        }
        default: {
          value += char
        }
      }
    }
  }
  if (value !== '' || row.length > 0) {
    rows.push([...row, value])
  }
  return rows
}

/** 表頭中名為 oldHeader 的格改為 newHeader。找不到時為 null */
export function renameCsvHeader (text: string, oldHeader: string, newHeader: string): string | null {
  const cell = headerCells(text).find(candidate => candidate.value === oldHeader)
  return cell ? text.slice(0, cell.from) + cellText(newHeader) + text.slice(cell.to) : null
}

export interface HeaderCheck {
  /** CSV 中有、schema 中沒有的表頭 */
  unknown: string[]
  /** schema 中有、CSV 中沒有的表頭，依 schema 的順序 */
  missing: string[]
}

/** 比對 CSV 的表頭與 schema 中真實欄位的 Sheet 表頭 */
export function checkHeaders (headers: readonly string[], expected: readonly string[]): HeaderCheck {
  return {
    unknown: headers.filter(header => !expected.includes(header)),
    missing: expected.filter(header => !headers.includes(header)),
  }
}
