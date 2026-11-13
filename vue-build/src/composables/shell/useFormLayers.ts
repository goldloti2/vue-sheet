import type { FormView, Layer, LayerMarker, LayerView, StoredMarker } from '@/composables/shell/formLayerState'
import type { TableKey } from '@/schema'
import { layerNavigation, layers, layersAfterNavigation, layersLeaving, leaveConfirmText, markerOf, staleJump } from '@/composables/shell/formLayerState'
import { confirm } from '@/composables/shell/useDialogs'
import router from '@/router'
import { useTablesStore } from '@/stores/tables'

export type OpenFormOptions = Omit<FormView, 'kind' | 'table'>

// 流程的步驟（見 useFlow）
export interface FlowStepOptions {
  // 以 replace 取代上一步的格子
  replace: boolean
  alwaysAsk: boolean
}

let nextId = 1
let releaseSync: (() => void) | null = null

// 導覽目的地那一格的標記。守衛執行時，返回與前進的 history.state 已是目的地的那一格，推入與取代則仍為目前這一格
function currentMarker (fullPath: string): LayerMarker | undefined {
  return markerOf(router.options.history.state, fullPath)
}

// 目前這一格中頁面自己的 state，例如 dashboard 展開的面板。vue-router 自己的欄位與表單層的標記除外
function pageState (): Record<string, unknown> {
  const { back: _back, current: _current, forward: _forward, position: _position, replaced: _replaced, scroll: _scroll, formLayer: _formLayer, ...rest } = router.options.history.state
  return rest
}

// 開啟一層，等待它關閉後回傳結果。一般的層回傳時 history 已回到下方那一格。取消時為 null
export function openLayer<Result> (view: LayerView, step?: FlowStepOptions): Promise<Result | null> {
  return new Promise(resolve => {
    const depth = layers.value.length
    const layer: Layer = {
      id: nextId++,
      depth: step?.replace ? Math.max(depth, 1) : depth + 1,
      size: view.kind === 'form' ? 'page' : 'dialog',
      view,
      closing: false,
      result: null,
      keepsEntry: step !== undefined,
      alwaysAsk: step?.alwaysAsk ?? false,
      dirty: () => false,
      settle: result => resolve(result as Result | null),
    }
    layerNavigation.opening = layer

    const { path, query, hash, fullPath } = router.currentRoute.value
    const marker: StoredMarker = { id: layer.id, depth: layer.depth, path: fullPath }
    const target = { path, query, hash, state: { ...pageState(), formLayer: { ...marker } }, force: true }
    void (step?.replace ? router.replace(target) : router.push(target)).then(failure => {
      if (failure && layerNavigation.opening === layer) {
        layerNavigation.opening = null
        resolve(null)
      }
    })
  })
}

// 開啟新增或編輯的表單。送出時回傳寫入後的列，取消時為 null
export function openForm<Row> (table: TableKey, options: OpenFormOptions = {}, step?: FlowStepOptions): Promise<Row | null> {
  return openLayer<Row>({ kind: 'form', table, ...options }, step)
}

// 由程式關閉最上層並交出結果，不詢問。只有第一次呼叫有效
export function closeLayer (layer: Layer, result: unknown): void {
  if (layer.closing) {
    return
  }
  layer.closing = true
  layer.result = result

  if (layer.keepsEntry) {
    layer.settle(result)
  } else {
    router.back()
  }
}

// 使用者要求關閉最上層，與返回鍵相同：有改動時先詢問
export function requestCloseLayer (): void {
  router.back()
}

// 流程結束時，最後一步仍保留著格子便離開這一格
export function leaveKeptEntry (): void {
  const top = layers.value.at(-1)
  if (top?.keepsEntry && top.closing) {
    router.back()
  }
}

function holdSyncWhileOpen (): void {
  if (layers.value.length > 0) {
    releaseSync ??= useTablesStore().holdSync()
  } else {
    releaseSync?.()
    releaseSync = null
  }
}

router.beforeEach(async to => {
  if (layerNavigation.opening || layerNavigation.jumping) {
    return true
  }

  const text = leaveConfirmText(layersLeaving(layers.value, currentMarker(to.fullPath)))
  return text === undefined ? true : confirm('放棄變更', text)
})

// 堆疊只在此處改變。回傳結果時 history 已到位
router.afterEach((to, _from, failure) => {
  const wasJumping = layerNavigation.jumping
  layerNavigation.jumping = false

  if (failure) {
    // 選單等覆蓋層可能擋下返回。已送出的層資料已寫入，不恢復送出，再次離開
    if (layers.value.at(-1)?.closing && !layers.value.at(-1)?.keepsEntry) {
      setTimeout(() => router.back())
    }
    return
  }

  const marker = currentMarker(to.fullPath)
  const { opening } = layerNavigation
  layerNavigation.opening = null
  const candidates = opening && marker?.id === opening.id ? [...layers.value, opening] : layers.value
  const { kept, closed } = layersAfterNavigation(candidates, marker)

  layers.value = kept
  holdSyncWhileOpen()

  // 由最上層開始交出結果
  for (let index = closed.length - 1; index >= 0; index--) {
    const layer = closed[index]!
    layer.settle(layer.closing ? layer.result : null)
  }

  const jump = wasJumping ? 0 : staleJump(kept, marker)
  if (jump !== 0) {
    layerNavigation.jumping = true
    router.go(jump)
  }
})
