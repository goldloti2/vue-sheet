import type { EditorView } from '@codemirror/view'

// 欄位查詢把 key 插入此文字編輯器：最後聚焦的文字編輯器，或剛建立的文字編輯器
let target: EditorView | null = null

export function rememberInsertTarget (view: EditorView): void {
  target = view
}

export function forgetInsertTarget (view: EditorView): void {
  if (target === view) {
    target = null
  }
}

// 取代選取的文字並聚焦。沒有文字編輯器時回傳 false
export function insertAtCursor (text: string): boolean {
  if (!target) {
    return false
  }
  target.dispatch(target.state.replaceSelection(text))
  target.focus()
  return true
}
