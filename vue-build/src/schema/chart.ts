import type { AnyColumn, ColumnKey, RowKey, TableSchema } from './types'
import { findColumn } from './types'

// 圖表：一張表的列如何畫成一張圖（見 docs/topics/chart.md）。定義於頁面，交給圖表元件

// 可分組的欄位：select、boolean、date、number、duration。型別上與其他欄位分不出來，由 defineChart 於執行時檢查
type GroupKey<Row extends object> = RowKey<Row>
// 可計算的欄位：number、duration、boolean
type ValueKey<Row extends object> = ColumnKey<Row, string | number | boolean | null>
// 可作為座標的欄位：number、date、duration
type CoordinateKey<Row extends object> = ColumnKey<Row, string | number | Date | null>

interface ChartGroup<Row extends object> {
  key: GroupKey<Row>
  // date 以年、月或日為一組，date 必填
  unit?: 'year' | 'month' | 'day'
  // number、duration 在最小值與最大值之間等分的段數，預設 5
  bins?: number
  // 依分組本身（與列表的排序規則相同）或依數值排序，預設依分組本身、升序
  order?: { by?: 'group' | 'value', direction?: 'asc' | 'desc' }
}

// 只顯示數值最大的前 N 組，其餘合併為「其他」。圓餅類預設 5，bar 預設全部
interface LimitedGroup<Row extends object> extends ChartGroup<Row> {
  limit?: number
}

// count 無須欄位。百分比只用於 count 與 sum（boolean 的 sum 為「是」的數量）
type ChartValue<Row extends object> = (
  | { stat: 'count', key?: never, percent?: boolean }
  | { stat: 'sum', key: ValueKey<Row>, percent?: boolean }
  | { stat: 'avg' | 'min' | 'max', key: ValueKey<Row>, percent?: never }
) & {
  // 圖例的文字，預設由統計方式與欄位名稱組成
  label?: string
}

// bar 與 line 的數值可改畫成另一種，並指定左右軸
type MixedValue<Row extends object> = ChartValue<Row> & {
  type?: 'bar' | 'line'
  axis?: 'left' | 'right'
}

interface BarChart<Row extends object> {
  type: 'bar'
  group: LimitedGroup<Row>
  // 第二層分組，每一組成為一個 dataset
  series?: ChartGroup<Row>
  values: MixedValue<Row>[]
  stacked?: boolean
  horizontal?: boolean
}

interface LineChart<Row extends object> {
  type: 'line'
  group: ChartGroup<Row>
  series?: ChartGroup<Row>
  values: MixedValue<Row>[]
  stacked?: boolean
}

// 多個數值或 series 畫成同心圓，兩者擇一
type PieChart<Row extends object> = {
  type: 'pie' | 'doughnut'
  group: LimitedGroup<Row>
} & (
  | { series: ChartGroup<Row>, values: [ChartValue<Row>] }
  | { series?: never, values: ChartValue<Row>[] }
)

interface PolarAreaChart<Row extends object> {
  type: 'polarArea'
  group: LimitedGroup<Row>
  values: [ChartValue<Row>]
}

// group 為各軸，series 為各條線
interface RadarChart<Row extends object> {
  type: 'radar'
  group: ChartGroup<Row>
  series?: ChartGroup<Row>
  values: ChartValue<Row>[]
}

// 每一列為一個點。color 依一欄上色，可用的欄位與分組相同
interface ScatterChart<Row extends object> {
  type: 'scatter'
  x: CoordinateKey<Row>
  y: CoordinateKey<Row>
  color?: GroupKey<Row>
}

interface BubbleChart<Row extends object> {
  type: 'bubble'
  x: CoordinateKey<Row>
  y: CoordinateKey<Row>
  r: ColumnKey<Row, number | null>
  color?: GroupKey<Row>
}

type ChartInput<Row extends object>
  = | BarChart<Row>
    | LineChart<Row>
    | PieChart<Row>
    | PolarAreaChart<Row>
    | RadarChart<Row>
    | ScatterChart<Row>
    | BubbleChart<Row>

// defineChart 的結果，交給圖表元件
export interface ChartDefinition<Row extends object> {
  schema: TableSchema<Row>
  input: ChartInput<Row>
}

const GROUP_TYPES = new Set(['select', 'boolean', 'date', 'number', 'duration'])
const VALUE_TYPES = new Set(['number', 'duration', 'boolean'])
const COORDINATE_TYPES = new Set(['number', 'date', 'duration'])

// 執行時檢查用的寬鬆形狀，不依賴 Row
interface LooseGroup {
  key: string
  unit?: string
}

interface LooseInput {
  type: ChartInput<object>['type']
  group?: LooseGroup
  series?: LooseGroup
  values?: { key?: string }[]
  x?: string
  y?: string
  r?: string
  color?: string
}

// 型別檢查不到的規則，開發模式下以 console 警告
function checkInput (schema: TableSchema, input: LooseInput): void {
  const warn = (message: string) => console.warn(`defineChart（${schema.tableLabel}）：${message}`)

  function column (key: string, allowed: ReadonlySet<string>, role: string): AnyColumn | undefined {
    const found = findColumn(schema, key)
    if (!found) {
      warn(`找不到欄位 ${key}`)
    } else if (!allowed.has(found.type)) {
      warn(`${found.label}（${found.type}）不可作為${role}`)
    }
    return found
  }

  function checkGroup (group: LooseGroup | undefined, role: string) {
    if (!group) {
      return
    }
    const found = column(group.key, GROUP_TYPES, role)
    if (found?.type === 'date' && !group.unit) {
      warn(`${found.label} 為 date，須指定 unit`)
    }
  }

  for (const [key, allowed, role] of [
    [input.x, COORDINATE_TYPES, 'x 座標'],
    [input.y, COORDINATE_TYPES, 'y 座標'],
    [input.r, new Set(['number']), '半徑'],
    [input.color, GROUP_TYPES, '顏色的分組'],
  ] as const) {
    if (key) {
      column(key, allowed, role)
    }
  }

  checkGroup(input.group, '分組')
  checkGroup(input.series, '系列')
  for (const value of input.values ?? []) {
    if (value.key) {
      column(value.key, VALUE_TYPES, '數值')
    }
  }
}

export function defineChart<Row extends object> (schema: TableSchema<Row>, input: ChartInput<Row>): ChartDefinition<Row> {
  if (import.meta.env.DEV) {
    checkInput(schema, input as LooseInput)
  }
  return { schema, input }
}
