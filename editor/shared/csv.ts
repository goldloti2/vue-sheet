// CSV 的表頭（第一列）。格可以雙引號括住，引號中的 "" 為一個引號

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

/** 表頭中名為 oldHeader 的格改為 newHeader。找不到時為 null */
export function renameCsvHeader (text: string, oldHeader: string, newHeader: string): string | null {
  const cell = headerCells(text).find(candidate => candidate.value === oldHeader)
  return cell ? text.slice(0, cell.from) + cellText(newHeader) + text.slice(cell.to) : null
}
