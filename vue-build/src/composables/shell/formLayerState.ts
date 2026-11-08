import type { TableKey } from '@/schema'
import type { TableSchema } from '@/schema/types'
import type { Component } from 'vue'
import { shallowRef } from 'vue'

export type LayerSize = 'page' | 'dialog'

// 表單層在 history.state 中的標記。沒有標記的格子不屬於任何表單層
export interface LayerMarker {
  id: number
  depth: number
}

// 新增或編輯一列的表單，有 id 時為編輯
export interface FormView {
  kind: 'form'
  table: TableKey
  id?: string
  defaults?: Record<string, unknown>
  order?: readonly string[]
  lockId?: boolean
  content?: Component
}

// 詢問指定的欄位，不寫入資料（見 useAskFields）
export interface FieldsView {
  kind: 'fields'
  title: string
  schema: TableSchema
  keys: string[]
  lockId: boolean
  initial: Record<string, unknown>
}

export type LayerView = FormView | FieldsView

export interface Layer extends LayerMarker {
  size: LayerSize
  view: LayerView
  // 已由程式關閉，等待導覽完成。此後不再接受送出，離開時不詢問
  closing: boolean
  result: unknown
  // 流程的步驟：關閉時保留 history 的格子，由下一步取代
  keepsEntry: boolean
  // 流程的第二步起：前面的步驟已寫入，離開時一律詢問
  alwaysAsk: boolean
  // 由這一層的表單於建立時設定
  dirty: () => boolean
  settle: (result: unknown) => void
}

// 不依賴 router，router 與 useFormLayers 皆可匯入
export const layers = shallowRef<readonly Layer[]>([])

export const layerNavigation = {
  // 已登記、導覽尚未完成的表單層
  opening: null as Layer | null,
  // 離開失效格子的導覽正在進行
  jumping: false,
}

// 導覽完成後各層的去留：只保留目前這一格以下的層
export function layersAfterNavigation (stack: readonly Layer[], marker: LayerMarker | undefined): { kept: Layer[], closed: Layer[] } {
  const kept = marker ? stack.filter(layer => layer.depth < marker.depth || layer.id === marker.id) : []
  return { kept, closed: stack.filter(layer => !kept.includes(layer)) }
}

// 目前這一格是失效的格子時，回傳跳回最近有效位置的格數。否則為 0
export function staleJump (kept: readonly Layer[], marker: LayerMarker | undefined): number {
  if (!marker || kept.some(layer => layer.id === marker.id)) {
    return 0
  }
  return Math.min(kept.length - marker.depth, 0)
}

// 一次導覽將關閉的層。推入、取代或前往其他頁面時，history.state 仍為目前這一格，因此全部的層都會關閉
export function layersLeaving (stack: readonly Layer[], marker: LayerMarker | undefined): readonly Layer[] {
  if (marker && !stack.some(layer => layer.id === marker.id)) {
    return []
  }
  const top = stack.at(-1)
  return marker?.id === top?.id ? stack : layersAfterNavigation(stack, marker).closed
}

// 離開這些層前的確認文字。無須詢問時為 undefined
export function leaveConfirmText (leaving: readonly Layer[]): string | undefined {
  const open = leaving.filter(layer => !layer.closing)
  if (open.some(layer => layer.alwaysAsk)) {
    return '是否放棄未儲存的變更（包含之前的變更）？'
  }
  return open.some(layer => layer.dirty()) ? '有尚未儲存的變更，確定要離開嗎？' : undefined
}

// 導覽的種類，決定動畫、捲動與導覽次數。none 為一般的頁面導覽，silent 為不應被看見的跳回
export function layerNavigationKind (marker: LayerMarker | undefined, samePath: boolean): 'none' | 'silent' | LayerSize {
  const { opening, jumping } = layerNavigation
  if (jumping) {
    return 'silent'
  }
  if (opening) {
    return opening.size
  }

  const stack = layers.value
  if (marker && !stack.some(layer => layer.id === marker.id)) {
    return 'silent'
  }

  const top = stack.at(-1)
  return top && samePath && marker?.id !== top.id ? top.size : 'none'
}
