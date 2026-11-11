import type { MaybeRefOrGetter, Ref } from 'vue'
import { nextTick, onBeforeUnmount, shallowRef, toValue, watch } from 'vue'

// 欄寬的三種設定，規則見 docs/components/list/DataTable.md 的「欄寬」
export type ColumnWidth = 'max' | 'default' | 'min'

export interface ColumnMeasure {
  width: ColumnWidth
  // 此欄最寬的一格（含表頭與左右內距），單位為 px
  content: number
}

function sum (values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

// width 由 sharers 欄與最小欄分配時的一份。最小欄由窄到寬放入，放不下時停止。沒有其他欄且最小欄全部放得下時為 Infinity
function shareOf (width: number, sharers: number, minContents: number[]): number {
  let used = 0
  let remaining = minContents.length
  // eslint-disable-next-line unicorn/no-array-sort
  for (const content of [...minContents].sort((a, b) => a - b)) {
    if (content > (width - used) / (sharers + remaining)) {
      break
    }
    used += content
    remaining--
  }
  return sharers + remaining > 0 ? (width - used) / (sharers + remaining) : Infinity
}

// 依可用寬度、各欄的設定與內容寬計算每欄的寬度（px）。純函數
export function layoutColumns (available: number, columns: readonly ColumnMeasure[]): number[] {
  const content = columns.map(column => column.content)
  const indexesOf = (width: ColumnWidth) => columns.flatMap((column, index) => column.width === width ? [index] : [])
  const maxes = indexesOf('max')
  const defaults = indexesOf('default')
  const mins = indexesOf('min')

  // 只有最小欄時，各欄均分可用寬度
  if (maxes.length === 0 && defaults.length === 0) {
    return content.map(() => available / columns.length)
  }

  // 預設欄的一份：扣除最大欄後與最小欄分配。全部放不下時，下限為最大欄也算作一份時的寬度
  const minContents = mins.map(index => content[index])
  let share = shareOf(available - sum(maxes.map(index => content[index])), defaults.length, minContents)
  if (sum(content) > available && maxes.length > 0) {
    share = Math.max(share, shareOf(available, maxes.length + defaults.length, minContents))
  }

  const widths = content.map((width, index) => {
    if (defaults.includes(index)) {
      return share
    }
    return mins.includes(index) ? Math.min(width, share) : width
  })

  // 畫面仍有剩餘寬度時（沒有預設欄且最小欄皆放得下），由最大欄均分
  const leftover = available - sum(widths)
  if (leftover > 0) {
    for (const index of maxes) {
      widths[index] += leftover / maxes.length
    }
  }
  return widths
}

// 容器扣除左右外框的寬度，無條件捨去為整數。clientWidth 為四捨五入，可能大於實際寬度，刻意不使用。純函數
export function usableWidth (boxWidth: number, borderLeft: number, borderRight: number): number {
  return Math.floor(boxWidth - borderLeft - borderRight)
}

// 量測各欄不換行的內容寬並計算欄寬，資料或可用寬度改變時重算。每格的內容須包在行內的 .data-table__content 中
export function useColumnWidths (
  wrapper: Ref<HTMLElement | null>,
  widthsOf: MaybeRefOrGetter<ColumnWidth[] | null>,
  deps: MaybeRefOrGetter<unknown>,
) {
  const widths = shallowRef<number[] | null>(null)
  // 分配欄寬時使用的可用寬度，供表格判斷是否超出
  const available = shallowRef(0)

  function measure () {
    const modes = toValue(widthsOf)
    const element = wrapper.value
    // KeepAlive 收起頁面時 DOM 不在文件中，不量測，保留原本的欄寬
    if (element && !element.isConnected) {
      return
    }
    const table = element?.querySelector('table')
    if (!modes || !element || !table) {
      widths.value = null
      return
    }

    const cells = [...table.rows].flatMap(row => [...row.cells].flatMap((cell, index) => {
      const inner = cell.querySelector<HTMLElement>('.data-table__content')
      return inner && index < modes.length ? [{ cell, inner, index }] : []
    }))

    // 表格允許換行時，暫時令每格不換行再量測
    for (const { inner } of cells) {
      inner.style.whiteSpace = 'nowrap'
    }
    const content = modes.map(() => 0)
    for (const { cell, inner, index } of cells) {
      const style = getComputedStyle(cell)
      const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight)
      // 多留 1px 給格線與小數點，剛好放得下的文字才不會被截斷
      content[index] = Math.max(content[index], Math.ceil(inner.getBoundingClientRect().width + padding) + 1)
    }
    for (const { inner } of cells) {
      inner.style.whiteSpace = ''
    }

    const box = getComputedStyle(element)
    available.value = usableWidth(element.getBoundingClientRect().width, Number.parseFloat(box.borderLeftWidth), Number.parseFloat(box.borderRightWidth))
    widths.value = layoutColumns(available.value, modes.map((width, index) => ({ width, content: content[index] })))
  }

  watch([() => toValue(widthsOf), () => toValue(deps)], () => nextTick(measure), { immediate: true, flush: 'post' })

  const observer = new ResizeObserver(() => measure())
  watch(wrapper, (element, previous) => {
    if (previous) {
      observer.unobserve(previous)
    }
    if (element) {
      observer.observe(element)
    }
  }, { immediate: true })
  onBeforeUnmount(() => observer.disconnect())

  return { widths, available }
}
