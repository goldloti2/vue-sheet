import type { ColumnFilter } from './filter'
import type { AnyColumn, ColumnKey, RowKey, TableSchema } from './types'
import { sortRows } from './sort'
import { booleanText, durationSeconds, findColumn, formatDate, formatDuration } from './types'
import { isEmpty } from './validation'

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
  // 分組欄為空的列不列入圖表，百分比的分母也不包含。預設保留為「(空白)」一組
  excludeBlank?: boolean
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

// 數值的單位，供圖表元件格式化刻度與提示
export type ChartUnit = 'number' | 'duration' | 'percent' | 'date'

export interface CategoryDataset {
  label: string
  // 與 labels 一一對應，null 為留空
  data: (number | null)[]
  unit: ChartUnit
  type?: 'bar' | 'line'
  axis?: 'left' | 'right'
}

export interface ChartPoint<Row> {
  x: number
  y: number
  r?: number
  row: Row
}

export interface PointDataset<Row> {
  label: string
  data: ChartPoint<Row>[]
}

// 選取一組的篩選條件。無法以一個條件表示時（例如區間合併的「其他」）為 null
export interface GroupFilter {
  key: string
  condition: ColumnFilter
}

export interface ChartGroupData<Row> {
  rows: Row[]
  filter: GroupFilter | null
}

// compute 的結果，不含顏色
export type ChartData<Row>
  = | { kind: 'category', labels: string[], datasets: CategoryDataset[], groups: ChartGroupData<Row>[] }
    | { kind: 'point', datasets: PointDataset<Row>[], xUnit: ChartUnit, yUnit: ChartUnit }

// defineChart 的結果，交給圖表元件
export interface ChartDefinition<Row extends object> {
  type: ChartInput<Row>['type']
  stacked: boolean
  horizontal: boolean
  // 分組欄。互動儀表板中，圖表忽略此欄的篩選條件
  groupKey: string | null
  compute: (rows: readonly Row[]) => ChartData<Row>
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

const BLANK_LABEL = '(空白)'
const OTHER_LABEL = '其他'
const DEFAULT_BINS = 5
const PIE_LIMIT = 5
const PIE_TYPES = new Set(['pie', 'doughnut', 'polarArea'])
const STAT_LABELS = { sum: '總和', avg: '平均', min: '最小', max: '最大' } as const

type DateUnit = NonNullable<ChartGroup<object>['unit']>
// 列的欄位以 key 讀取
type Cell = Record<string, unknown>
// 不區分各表的輸入，與 TableSchema 預設的 Row 相同
type AnyRow = any
type AnyChartInput = ChartInput<AnyRow>
type CategoryInput = Exclude<AnyChartInput, ScatterChart<AnyRow> | BubbleChart<AnyRow>>
type Value = ChartValue<AnyRow>

// 一組列，以及選取這一組的篩選條件
interface Bucket<Row> {
  label: string
  filter: GroupFilter | null
  rows: Row[]
}

function pad (value: number): string {
  return String(value).padStart(2, '0')
}

function numberText (value: number): string {
  return String(Math.round(value * 100) / 100)
}

// 換算為數字：boolean 為 1 或 0，duration 為秒數，date 為毫秒。空值為 null
function toNumber (value: unknown, column: AnyColumn): number | null {
  if (isEmpty(value)) {
    return null
  }
  if (column.type === 'boolean') {
    return value === true ? 1 : 0
  }
  if (column.type === 'duration') {
    return durationSeconds(value)
  }
  if (value instanceof Date) {
    return value.getTime()
  }
  return typeof value === 'number' ? value : null
}

function unitOf (column: AnyColumn): ChartUnit {
  if (column.type === 'date') {
    return 'date'
  }
  return column.type === 'duration' ? 'duration' : 'number'
}

function dateStart (date: Date, unit: DateUnit): Date {
  if (unit === 'year') {
    return new Date(date.getFullYear(), 0, 1)
  }
  return unit === 'month' ? new Date(date.getFullYear(), date.getMonth(), 1) : new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function dateNext (start: Date, unit: DateUnit): Date {
  if (unit === 'year') {
    return new Date(start.getFullYear() + 1, 0, 1)
  }
  return unit === 'month' ? new Date(start.getFullYear(), start.getMonth() + 1, 1) : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
}

function dateLabel (start: Date, unit: DateUnit): string {
  if (unit === 'year') {
    return String(start.getFullYear())
  }
  return unit === 'month' ? `${start.getFullYear()}/${pad(start.getMonth() + 1)}` : formatDate(start)
}

// date 依年、月或日分組。從最早的一段到最晚的一段，沒有列的區間也列出
function dateBuckets<Row> (rows: readonly Row[], column: AnyColumn, unit: DateUnit, blank: Row[]): Bucket<Row>[] {
  const starts = new Map<number, Row[]>()
  for (const row of rows) {
    const value = (row as Cell)[column.key]
    if (!(value instanceof Date)) {
      blank.push(row)
      continue
    }
    const time = dateStart(value, unit).getTime()
    starts.set(time, [...starts.get(time) ?? [], row])
  }
  if (starts.size === 0) {
    return []
  }

  const buckets: Bucket<Row>[] = []
  let start = new Date(Math.min(...starts.keys()))
  const last = Math.max(...starts.keys())
  while (start.getTime() <= last) {
    const next = dateNext(start, unit)
    const end = new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1)
    buckets.push({
      label: dateLabel(start, unit),
      filter: { key: column.key, condition: { min: start, max: end } },
      rows: starts.get(start.getTime()) ?? [],
    })
    start = next
  }
  return buckets
}

// number、duration 在最小值與最大值之間等分。最大值歸入最後一段，區間的條件包含兩端
function rangeBuckets<Row> (rows: readonly Row[], column: AnyColumn, bins: number, blank: Row[]): Bucket<Row>[] {
  const entries: { row: Row, value: number }[] = []
  for (const row of rows) {
    const value = toNumber((row as Cell)[column.key], column)
    if (value === null) {
      blank.push(row)
    } else {
      entries.push({ row, value })
    }
  }
  if (entries.length === 0) {
    return []
  }

  const min = Math.min(...entries.map(entry => entry.value))
  const max = Math.max(...entries.map(entry => entry.value))
  const count = max === min ? 1 : Math.max(1, Math.floor(bins))
  const width = (max - min) / count
  const text = column.type === 'duration' ? formatDuration : numberText
  const bound = (value: number) => column.type === 'duration' ? formatDuration(value) : value

  const buckets: Bucket<Row>[] = Array.from({ length: count }, (_, index) => {
    const low = min + index * width
    const high = index === count - 1 ? max : min + (index + 1) * width
    return {
      label: count === 1 ? text(low) : `${text(low)} ～ ${text(high)}`,
      filter: { key: column.key, condition: { min: bound(low), max: bound(high) } },
      rows: [],
    }
  })
  for (const { row, value } of entries) {
    const index = width === 0 ? 0 : Math.min(Math.floor((value - min) / width), count - 1)
    buckets[index].rows.push(row)
  }
  return buckets
}

// select、boolean 等依值本身分組，每個出現過的值為一組
function valueBuckets<Row> (rows: readonly Row[], column: AnyColumn, blank: Row[]): Bucket<Row>[] {
  const buckets = new Map<string, Bucket<Row>>()
  for (const row of rows) {
    const value = (row as Cell)[column.key]
    if (isEmpty(value)) {
      blank.push(row)
      continue
    }
    const id = String(value)
    const bucket = buckets.get(id) ?? {
      label: typeof value === 'boolean' ? booleanText(value) : id,
      filter: { key: column.key, condition: { values: [id] } },
      rows: [],
    }
    bucket.rows.push(row)
    buckets.set(id, bucket)
  }
  return [...buckets.values()]
}

// 依分組本身排序。「(空白)」一律排在最後
function groupBuckets<Row> (schema: TableSchema, rows: readonly Row[], column: AnyColumn, group: ChartGroup<AnyRow>): Bucket<Row>[] {
  const blank: Row[] = []
  const direction = group.order?.direction ?? 'asc'
  let buckets: Bucket<Row>[]
  if (['date', 'number', 'duration'].includes(column.type)) {
    // 區間依先後產生，降序時反轉
    buckets = column.type === 'date'
      ? dateBuckets(rows, column, group.unit ?? 'month', blank)
      : rangeBuckets(rows, column, group.bins ?? DEFAULT_BINS, blank)
    if (direction === 'desc') {
      buckets.reverse()
    }
  } else {
    // 以各組的第一列交給 sortRows，排序規則與列表相同
    const byFirstRow = new Map(valueBuckets(rows, column, blank).map(bucket => [bucket.rows[0], bucket]))
    buckets = sortRows([...byFirstRow.keys()], schema, [{ key: column.key, direction }]).map(row => byFirstRow.get(row)!)
  }

  if (blank.length > 0 && !group.excludeBlank) {
    buckets.push({ label: BLANK_LABEL, filter: { key: column.key, condition: { values: [null] } }, rows: blank })
  }
  return buckets
}

// 合併多組為「其他」。各組皆以 values 表示時合併各值，否則沒有條件
function mergeOther<Row> (buckets: Bucket<Row>[], key: string): Bucket<Row> {
  const values = buckets.flatMap(bucket => bucket.filter?.condition.values ?? [undefined])
  return {
    label: OTHER_LABEL,
    filter: values.includes(undefined) ? null : { key, condition: { values: values as (string | null)[] } },
    rows: buckets.flatMap(bucket => bucket.rows),
  }
}

// 一組列的統計值。沒有列時 count 與 sum 為 0，avg、min、max 為 null
function statOf<Row> (rows: readonly Row[], value: Value, column: AnyColumn | undefined): number | null {
  if (value.stat === 'count' || !column) {
    return rows.length
  }
  const numbers = rows
    .map(row => toNumber((row as Cell)[column.key], column))
    .filter((item): item is number => item !== null)
  const total = numbers.reduce((sum, item) => sum + item, 0)
  if (value.stat === 'sum') {
    return total
  }
  if (numbers.length === 0) {
    return null
  }
  if (value.stat === 'avg') {
    return total / numbers.length
  }
  return value.stat === 'min' ? Math.min(...numbers) : Math.max(...numbers)
}

function valueLabel (value: Value, column: AnyColumn | undefined): string {
  if (value.label) {
    return value.label
  }
  if (value.stat === 'count' || !column) {
    return '數量'
  }
  if (column.type === 'boolean' && value.stat === 'sum') {
    return `${column.label}為「是」的${'percent' in value && value.percent ? '比例' : '數量'}`
  }
  return `${column.label}的${STAT_LABELS[value.stat]}`
}

function percentOf (part: number | null, whole: number): number | null {
  return part === null || whole === 0 ? null : part / whole * 100
}

// 依數值排序，並將數值最大的前 N 組以外合併為「其他」。rank 為各組的第一個數值
function orderAndLimit<Row> (buckets: Bucket<Row>[], input: CategoryInput, rank: (bucket: Bucket<Row>) => number, key: string): Bucket<Row>[] {
  let ordered = buckets
  if (input.group.order?.by === 'value') {
    const sign = input.group.order.direction === 'desc' ? -1 : 1
    // eslint-disable-next-line unicorn/no-array-sort
    ordered = [...buckets].sort((a, b) => sign * (rank(a) - rank(b)))
  }

  const limit = 'limit' in input.group && input.group.limit !== undefined
    ? input.group.limit
    : (PIE_TYPES.has(input.type) ? PIE_LIMIT : Infinity)
  if (ordered.length <= limit) {
    return ordered
  }
  // eslint-disable-next-line unicorn/no-array-sort
  const kept = new Set([...ordered].sort((a, b) => rank(b) - rank(a)).slice(0, limit))
  return [...ordered.filter(bucket => kept.has(bucket)), mergeOther(ordered.filter(bucket => !kept.has(bucket)), key)]
}

interface SeriesSplit<Row> {
  buckets: Bucket<Row>[]
  of: Map<Row, Bucket<Row>>
}

// 一個數值的 dataset：沒有系列時一個，有系列時每個系列一個
function valueDatasets<Row> (value: Value, column: AnyColumn | undefined, buckets: Bucket<Row>[], series: SeriesSplit<Row> | undefined, options: { stacked: boolean, multiple: boolean }): CategoryDataset[] {
  const label = valueLabel(value, column)
  const mixed = value as MixedValue<AnyRow>
  const percent = 'percent' in value && Boolean(value.percent)
  const unit: ChartUnit = percent ? 'percent' : (value.stat === 'count' || !column ? 'number' : unitOf(column))

  const cells = (series?.buckets ?? [undefined]).map(seriesBucket => buckets.map(bucket => {
    const rows = seriesBucket ? bucket.rows.filter(row => series?.of.get(row) === seriesBucket) : bucket.rows
    return { rows, stat: statOf(rows, value, column) }
  }))
  const groupTotal = (groupIndex: number) => cells.reduce((sum, seriesCells) => sum + (seriesCells[groupIndex].stat ?? 0), 0)

  return cells.map((seriesCells, seriesIndex) => {
    const datasetTotal = seriesCells.reduce((sum, cell) => sum + (cell.stat ?? 0), 0)
    const data = seriesCells.map((cell, groupIndex) => {
      if (!percent) {
        return cell.stat
      }
      if (column?.type === 'boolean') {
        return percentOf(cell.stat, cell.rows.length)
      }
      return percentOf(cell.stat, options.stacked && series ? groupTotal(groupIndex) : datasetTotal)
    })

    const seriesLabel = series?.buckets[seriesIndex]?.label
    return {
      label: seriesLabel === undefined ? label : (options.multiple ? `${label}（${seriesLabel}）` : seriesLabel),
      data,
      unit,
      ...(mixed.type ? { type: mixed.type } : {}),
      ...(mixed.axis ? { axis: mixed.axis } : {}),
    }
  })
}

function computeCategory<Row> (schema: TableSchema, input: CategoryInput, rows: readonly Row[]): ChartData<Row> {
  const groupColumn = findColumn(schema, input.group.key)
  if (!groupColumn) {
    return { kind: 'category', labels: [], datasets: [], groups: [] }
  }

  const values = input.values as Value[]
  const columns = values.map(value => value.key ? findColumn(schema, value.key) : undefined)
  const rank = (bucket: Bucket<Row>) => statOf(bucket.rows, values[0], columns[0]) ?? -Infinity
  const buckets = orderAndLimit(groupBuckets(schema, rows, groupColumn, input.group), input, rank, groupColumn.key)

  const seriesGroup = 'series' in input ? input.series : undefined
  const seriesColumn = seriesGroup ? findColumn(schema, seriesGroup.key) : undefined
  let series: SeriesSplit<Row> | undefined
  if (seriesGroup && seriesColumn) {
    const seriesBuckets = groupBuckets(schema, rows, seriesColumn, seriesGroup)
    series = { buckets: seriesBuckets, of: new Map(seriesBuckets.flatMap(bucket => bucket.rows.map(row => [row, bucket] as const))) }
  }

  const options = { stacked: 'stacked' in input && Boolean(input.stacked), multiple: values.length > 1 }
  return {
    kind: 'category',
    labels: buckets.map(bucket => bucket.label),
    datasets: values.flatMap((value, index) => valueDatasets(value, columns[index], buckets, series, options)),
    groups: buckets.map(bucket => ({ rows: bucket.rows, filter: bucket.filter })),
  }
}

function computePoints<Row> (schema: TableSchema, input: ScatterChart<AnyRow> | BubbleChart<AnyRow>, rows: readonly Row[]): ChartData<Row> {
  const xColumn = findColumn(schema, input.x)
  const yColumn = findColumn(schema, input.y)
  const rColumn = input.type === 'bubble' ? findColumn(schema, input.r) : undefined
  const colorColumn = input.color ? findColumn(schema, input.color) : undefined
  if (!xColumn || !yColumn) {
    return { kind: 'point', datasets: [], xUnit: 'number', yUnit: 'number' }
  }

  const points = (list: readonly Row[]) => list.flatMap(row => {
    const x = toNumber((row as Cell)[xColumn.key], xColumn)
    const y = toNumber((row as Cell)[yColumn.key], yColumn)
    const r = rColumn ? toNumber((row as Cell)[rColumn.key], rColumn) : undefined
    return x === null || y === null || r === null ? [] : [{ x, y, ...(r === undefined ? {} : { r }), row }]
  })

  // 沒有任何點的組不列入，圖例不出現
  const datasets = colorColumn
    ? groupBuckets(schema, rows, colorColumn, { key: colorColumn.key })
        .map(bucket => ({ label: bucket.label, data: points(bucket.rows) }))
        .filter(dataset => dataset.data.length > 0)
    : [{ label: schema.tableLabel, data: points(rows) }]
  return { kind: 'point', datasets, xUnit: unitOf(xColumn), yUnit: unitOf(yColumn) }
}

export function defineChart<Row extends object> (schema: TableSchema<Row>, input: ChartInput<Row>): ChartDefinition<Row> {
  if (import.meta.env.DEV) {
    checkInput(schema, input as LooseInput)
  }

  const spec = input as AnyChartInput
  const isPoint = spec.type === 'scatter' || spec.type === 'bubble'
  return {
    type: spec.type,
    stacked: 'stacked' in spec && Boolean(spec.stacked),
    horizontal: 'horizontal' in spec && Boolean(spec.horizontal),
    groupKey: isPoint ? null : spec.group.key,
    compute: rows => spec.type === 'scatter' || spec.type === 'bubble'
      ? computePoints(schema, spec, rows)
      : computeCategory(schema, spec, rows),
  }
}
