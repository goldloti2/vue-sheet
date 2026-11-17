// 以逗號或換行分隔的清單：陣列的項目、物件的屬性、介面的成員。只處理文字，不解析程式
// 每一項各佔一行時為多行版面，每一項連同上方的註解一起插入、刪除與移動。其他情形為單行版面

export interface TextEdit {
  from: number
  to: number
  insert: string
}

export interface ListSpan {
  /** 開頭括號之後的位置 */
  open: number
  /** 結尾括號的位置 */
  close: number
  /** 各項的起訖，不含註解與分隔符號 */
  items: { from: number, to: number }[]
  /** 陣列為 ,，物件為 , 並於單行版面的括號內留空格，介面的成員以換行分隔 */
  kind: 'array' | 'object' | 'members'
}

// 由後往前套用，各段不重疊
export function applyEdits (text: string, edits: readonly TextEdit[]): string {
  let result = text
  for (const edit of edits.toSorted((a, b) => b.from - a.from)) {
    result = result.slice(0, edit.from) + edit.insert + result.slice(edit.to)
  }
  return result
}

function lineStart (text: string, pos: number): number {
  return text.lastIndexOf('\n', pos - 1) + 1
}

// 換行符號之後的位置。最後一行沒有換行時為文字的結尾
function nextLineStart (text: string, pos: number): number {
  const newline = text.indexOf('\n', pos)
  return newline === -1 ? text.length : newline + 1
}

function indentOf (text: string, pos: number): string {
  const start = lineStart(text, pos)
  return /^[ \t]*/.exec(text.slice(start, pos))?.[0] ?? ''
}

function separatorOf (list: ListSpan): string {
  return list.kind === 'members' ? '' : ','
}

// 一項所佔的整行：上方連續的註解行、項目本身，以及同一行的分隔符號與註解。空行不屬於任何一項
function chunkOf (text: string, list: ListSpan, index: number): { from: number, to: number } {
  const item = list.items[index]!
  const previousEnd = index === 0 ? list.open : list.items[index - 1]!.to
  let from = lineStart(text, item.from)
  // 往上納入緊接著的註解行
  while (from > 0) {
    const above = lineStart(text, from - 1)
    if (above <= previousEnd || !/^\s*(?:\/\/|\/\*|\*)/.test(text.slice(above, from))) {
      break
    }
    from = above
  }
  return { from, to: nextLineStart(text, item.to) }
}

// 每一項都從新的一行開始，並以分隔符號與註解結束該行，結尾括號也在自己的一行
export function isMultiline (text: string, list: ListSpan): boolean {
  if (list.items.length === 0) {
    return false
  }
  return list.items.every(item => {
    const before = text.slice(lineStart(text, item.from), item.from)
    const after = text.slice(item.to, nextLineStart(text, item.to))
    return /^\s*$/.test(before) && /^[,;]?\s*(?:\/\/.*)?$/.test(after.trim())
  }) && /^\s*$/.test(text.slice(lineStart(text, list.close), list.close))
}

// 每一行加上縮排，空行不加
function indentLines (itemText: string, indent: string): string {
  return itemText.split('\n').map(line => line.trim() === '' ? line : indent + line).join('\n')
}

// 多行版面的一項：文字可含多行，各行相對於該項的縮排
function multilineItem (itemText: string, indent: string, separator: string): string {
  return `${indentLines(itemText, indent)}${separator}\n`
}

/**
 * 於 index 之前插入一項。itemText 不含分隔符號
 * 清單為空時以 emptyLayout 決定版面
 */
export function insertItem (text: string, list: ListSpan, index: number, itemText: string, emptyLayout: 'inline' | 'multiline' = 'inline'): TextEdit[] {
  const separator = separatorOf(list)
  const count = list.items.length

  if (count === 0) {
    if (emptyLayout === 'multiline' || list.kind === 'members') {
      const outer = indentOf(text, list.open)
      return [{ from: list.open, to: list.close, insert: `\n${multilineItem(itemText, `${outer}  `, separator)}${outer}` }]
    }
    return [{ from: list.open, to: list.close, insert: list.kind === 'object' ? ` ${itemText} ` : itemText }]
  }

  if (isMultiline(text, list)) {
    if (index < count) {
      const indent = indentOf(text, list.items[index]!.from)
      return [{ from: chunkOf(text, list, index).from, to: chunkOf(text, list, index).from, insert: multilineItem(itemText, indent, separator) }]
    }
    const last = list.items[count - 1]!
    const edits: TextEdit[] = [{ from: chunkOf(text, list, count - 1).to, to: chunkOf(text, list, count - 1).to, insert: multilineItem(itemText, indentOf(text, last.from), separator) }]
    // 最後一項沒有逗號時補上
    if (separator && !/^\s*,/.test(text.slice(last.to))) {
      edits.push({ from: last.to, to: last.to, insert: separator })
    }
    return edits
  }

  const joiner = separator ? `${separator} ` : ' '
  return index < count
    ? [{ from: list.items[index]!.from, to: list.items[index]!.from, insert: `${itemText}${joiner}` }]
    : [{ from: list.items[count - 1]!.to, to: list.items[count - 1]!.to, insert: `${joiner}${itemText}` }]
}

/** 刪除一項，連同分隔符號。多行版面另刪除上方的註解與整行 */
export function removeItem (text: string, list: ListSpan, index: number): TextEdit[] {
  const count = list.items.length
  if (count === 1) {
    return [{ from: list.open, to: list.close, insert: '' }]
  }
  if (isMultiline(text, list)) {
    const chunk = chunkOf(text, list, index)
    return [{ from: chunk.from, to: chunk.to, insert: '' }]
  }
  const item = list.items[index]!
  return index < count - 1
    ? [{ from: item.from, to: list.items[index + 1]!.from, insert: '' }]
    : [{ from: list.items[index - 1]!.to, to: item.to, insert: '' }]
}

/** 把一項移到 to 的位置，to 為移動後的索引 */
export function moveItem (text: string, list: ListSpan, from: number, to: number): TextEdit[] {
  const count = list.items.length
  if (from === to || from < 0 || to < 0 || from >= count || to >= count) {
    return []
  }
  const order = list.items.map((_, index) => index)
  order.splice(to, 0, ...order.splice(from, 1))

  if (!isMultiline(text, list)) {
    return list.items.map((item, index) => ({ from: item.from, to: item.to, insert: text.slice(list.items[order[index]!]!.from, list.items[order[index]!]!.to) }))
  }

  // 各項的整行依新的順序排列，項目之間的空行留在原處。沒有逗號的最後一項補上逗號
  const separator = separatorOf(list)
  const chunks = list.items.map((item, index) => {
    const chunk = chunkOf(text, list, index)
    const head = text.slice(chunk.from, item.to)
    const tail = text.slice(item.to, chunk.to)
    return separator && !/^\s*,/.test(tail) ? `${head}${separator}${tail}` : head + tail
  })
  return list.items.map((_, index) => {
    const chunk = chunkOf(text, list, index)
    return { from: chunk.from, to: chunk.to, insert: chunks[order[index]!]! }
  })
}
