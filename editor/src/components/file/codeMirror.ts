import type { Extension } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { vue } from '@codemirror/lang-vue'
import { Compartment, EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { basicSetup } from 'codemirror'

// 保留的 EditorState 會換到另一個元件實例使用。state 中不放依賴元件實例的 extension，compartment 於模組層級共用
export const themeSlot = new Compartment()

export function themeExtension (dark: boolean): Extension {
  return dark ? oneDark : []
}

function language (path: string): Extension {
  if (path.endsWith('.vue')) {
    return vue()
  }
  if (path.endsWith('.ts')) {
    return javascript({ typescript: true })
  }
  return path.endsWith('.gs') ? javascript() : []
}

export function createEditorState (path: string, text: string, dark: boolean): EditorState {
  return EditorState.create({
    doc: text,
    extensions: [basicSetup, language(path), themeSlot.of(themeExtension(dark))],
  })
}
