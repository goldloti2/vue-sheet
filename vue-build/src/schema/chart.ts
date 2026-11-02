import type { ColumnFilter, Filters } from './filter'
import type { AnyColumn, ColorName, ColumnKey, RowKey, TableSchema } from './types'
import { isActiveFilter, matchesFilter } from './filter'
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

// 只顯示數值最大的前 N 組，其餘合併為「其他」。圓餅類預設 5，bar 與 stat 預設全部
interface LimitedGroup<Row extends object> extends ChartGroup<Row> {
  limit?: number
}

// 自訂的統計的第二個參數。groups 為各組的列，依圖上的順序，有系列時只含同一個系列的列。index 為此組於 groups 中的位置
export interface StatContext<Row> {
  index: number
  groups: readonly (readonly Row[])[]
}

// 自訂的統計：接收一組的列，回傳數值。null 為留空
export type StatFunction<Row extends object> = (rows: readonly Row[], context: StatContext<Row>) => number | null

// count 無須欄位。百分比只用於 count 與 sum（boolean 的 sum 為「是」的數量）
// stat 為函數時無須欄位，label 必填，unit 預設為 number（duration 為秒數，date 為毫秒）
type ChartValue<Row extends object> = (
  | { stat: 'count', key?: never, percent?: boolean, unit?: never }
  | { stat: 'sum', key: ValueKey<Row>, percent?: boolean, unit?: never }
  | { stat: 'avg' | 'min' | 'max', key: ValueKey<Row>, percent?: never, unit?: never }
  | { stat: StatFunction<Row>, key?: never, percent?: never, unit?: ChartUnit, label: string }
) & {
  // 圖例的文字，預設由統計方式與欄位名稱組成
  label?: string
}

// bar 與 line 的數值可改畫成另一種，並指定左右軸
type MixedValue<Row extends object> = ChartValue<Row> & {
  type?: 'bar' | 'line'
  axis?: 'left' | 'right'
}

// stat 的數值可指定格式
type StatValue<Row extends object> = ChartValue<Row> & StatFormat

// 數字的顏色：固定的顏色，或依數值決定，回傳 undefined 時為一般的文字顏色
export type StatTextColor = ColorName | ((value: number | null) => ColorName | undefined)

interface StatFormat {
  // 正數前方加「+」
  sign?: boolean
  // 數字後方的單位，取代百分比的「%」。duration 不適用
  suffix?: string
  textColor?: StatTextColor
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

// 每一列為一個點。series 依一欄將點分組上色
interface ScatterChart<Row extends object> {
  type: 'scatter'
  x: CoordinateKey<Row>
  y: CoordinateKey<Row>
  series?: ChartGroup<Row>
}

interface BubbleChart<Row extends object> {
  type: 'bubble'
  x: CoordinateKey<Row>
  y: CoordinateKey<Row>
  r: ColumnKey<Row, number | null>
  series?: ChartGroup<Row>
}

// 文字統計：每一組的每一個數值以文字顯示為一格，不使用 Chart.js。沒有 group 時全部的列為一組
interface StatChart<Row extends object> {
  type: 'stat'
  group?: LimitedGroup<Row>
  values: StatValue<Row>[]
}

// 依名稱指定顏色：依組上色時為組名，否則為圖例上 dataset 的名稱。「(空白)」與「其他」以 chartBlank、chartOthers 指定
export type ChartColors = Partial<Record<string, ColorName>> & {
  chartBlank?: ColorName
  chartOthers?: ColorName
}

type ChartInput<Row extends object> = (
  | BarChart<Row>
  | LineChart<Row>
  | PieChart<Row>
  | PolarAreaChart<Row>
  | RadarChart<Row>
  | ScatterChart<Row>
  | BubbleChart<Row>
  | StatChart<Row>
) & {
  colors?: ChartColors
}

// 數值的單位，供圖表元件格式化刻度與提示
export type ChartUnit = 'number' | 'duration' | 'percent' | 'date'

export interface CategoryDataset {
  label: string
  // 與 labels 一一對應，null 為留空
  data: (number | null)[]
  unit: ChartUnit
  type?: 'bar' | 'line'
  axis?: 'left' | 'right'
  // 有系列時，為 compute 結果中 series 的索引
  series?: number
  // 於 colors 中的名稱，見 ChartGroupData
  colorKey: string
  // stat 的格式，見 StatFormat
  sign?: boolean
  suffix?: string
  textColor?: StatTextColor
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
  // 於 colors 中的名稱，見 ChartGroupData
  colorKey: string
  // 有系列時，為 compute 結果中 series 的索引
  series?: number
}

// 選取一組的篩選條件。無法以一個條件表示時（例如區間合併的「其他」）為 null
export interface GroupFilter {
  key: string
  condition: ColumnFilter
}

export interface ChartGroupData<Row> {
  rows: Row[]
  filter: GroupFilter | null
  // 於 colors 中的名稱：一般為組名，「(空白)」為 chartBlank，「其他」為 chartOthers
  colorKey: string
}

// compute 的結果，不含顏色。series 為各系列，沒有時為空陣列
export type ChartData<Row>
  = | { kind: 'category', labels: string[], datasets: CategoryDataset[], groups: ChartGroupData<Row>[], series: ChartGroupData<Row>[] }
    | { kind: 'point', datasets: PointDataset<Row>[], series: ChartGroupData<Row>[], xUnit: ChartUnit, yUnit: ChartUnit }

// defineChart 的結果，交給圖表元件
export interface ChartDefinition<Row extends object> {
  type: ChartInput<Row>['type']
  stacked: boolean
  horizontal: boolean
  groupKey: string | null
  seriesKey: string | null
  // 分組欄與系列欄。圖表忽略這些欄的篩選條件，改為加上高光，交給 useListPage 的 ignoreFilter
  filterKeys: string[]
  colors: ChartColors
  compute: (rows: readonly Row[]) => ChartData<Row>
}

// 各組是否符合 key 欄的條件：有列，且每一列皆符合。該欄沒有條件時為 null
export function highlightOf<Row> (groups: readonly ChartGroupData<Row>[], key: string | null, filters: Filters): boolean[] | null {
  const filter = key ? filters[key] : undefined
  if (!key || !filter || !isActiveFilter(filter)) {
    return null
  }
  return groups.map(group => group.rows.length > 0 && group.rows.every(row => matchesFilter((row as Record<string, unknown>)[key], filter)))
}

function boundOf (value: unknown): unknown {
  return value instanceof Date ? value.getTime() : value
}

// 兩個條件是否相同：values 視為集合，區間比較兩端
function sameCondition (current: ColumnFilter | undefined, condition: ColumnFilter): boolean {
  if (!current || !isActiveFilter(current)) {
    return false
  }
  if (condition.values) {
    const values = current.values ?? []
    return values.length === condition.values.length && condition.values.every(value => values.includes(value))
  }
  return current.segment !== undefined && condition.segment !== undefined
    && boundOf(current.segment.min) === boundOf(condition.segment.min)
    && boundOf(current.segment.below) === boundOf(condition.segment.below)
}

// 以一份複製的條件取代 key 欄的條件。condition 為 null 時移除該欄的條件
function withCondition (filters: Filters, key: string, condition: ColumnFilter | null): Filters {
  const next = { ...filters }
  if (condition && isActiveFilter(condition)) {
    next[key] = {
      ...(condition.values ? { values: [...condition.values] } : {}),
      ...(condition.segment ? { segment: { ...condition.segment } } : {}),
    }
  } else {
    Reflect.deleteProperty(next, key)
  }
  return next
}

// 點擊圖例：切換一組或一個系列的值，可複選。區間只能選一段，再點同一段即移除
export function toggleLegend (filters: Filters, pick: GroupFilter): Filters {
  const values = pick.condition.values
  if (!values) {
    return withCondition(filters, pick.key, sameCondition(filters[pick.key], pick.condition) ? null : pick.condition)
  }
  const selected = filters[pick.key]?.values ?? []
  const next = values.every(value => selected.includes(value))
    ? selected.filter(value => !values.includes(value))
    : [...selected, ...values.filter(value => !selected.includes(value))]
  return withCondition(filters, pick.key, { values: next })
}

// 加入共用的儀表板面板中點擊圖表：只選這一組與其系列。各欄皆已為這些條件時，改為移除
export function pickElement (filters: Filters, picks: readonly GroupFilter[]): Filters {
  const same = picks.every(pick => sameCondition(filters[pick.key], pick.condition))
  return picks.reduce((next, pick) => withCondition(next, pick.key, same ? null : pick.condition), filters)
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
  values?: { key?: string, unit?: string, suffix?: string }[]
  x?: string
  y?: string
  r?: string
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

  // 點擊寫入的條件只篩選 searchable 中的欄位
  function checkSearchable (found: AnyColumn | undefined) {
    if (found && !(schema.searchable as readonly string[] | undefined)?.includes(found.key)) {
      warn(`${found.label} 未列於 searchable，點擊圖例或圖表寫入的條件不篩選列，也不顯示於篩選抽屜`)
    }
  }

  function checkGroup (group: LooseGroup | undefined, role: string) {
    if (!group) {
      return
    }
    const found = column(group.key, GROUP_TYPES, role)
    if (found?.type === 'date' && !group.unit) {
      warn(`${found.label} 為 date，須指定 unit`)
    }
    checkSearchable(found)
  }

  for (const [key, allowed, role] of [
    [input.x, COORDINATE_TYPES, 'x 座標'],
    [input.y, COORDINATE_TYPES, 'y 座標'],
    [input.r, new Set(['number']), '半徑'],
  ] as const) {
    if (key) {
      column(key, allowed, role)
    }
  }
  checkGroup(input.group, '分組')
  checkGroup(input.series, '系列')
  for (const value of input.values ?? []) {
    const found = value.key ? column(value.key, VALUE_TYPES, '數值') : undefined
    if ((found?.type === 'duration' || value.unit === 'duration') && value.suffix !== undefined) {
      warn(`${found?.label ?? '自訂的統計'} 為 duration，suffix 不適用`)
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
// 有分組的輸入。stat 的 group 可省略，其餘皆必填
type GroupedInput = CategoryInput & { group: LimitedGroup<AnyRow> }
type Value = ChartValue<AnyRow>

// 一組列，以及選取這一組的篩選條件
interface Bucket<Row> {
  label: string
  filter: GroupFilter | null
  rows: Row[]
  // 於 colors 中的名稱，省略時為 label
  colorKey?: string
}

function groupData<Row> (bucket: Bucket<Row>): ChartGroupData<Row> {
  return { rows: bucket.rows, filter: bucket.filter, colorKey: bucket.colorKey ?? bucket.label }
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
    buckets.push({
      label: dateLabel(start, unit),
      filter: { key: column.key, condition: { segment: { min: start, below: next } } },
      rows: starts.get(start.getTime()) ?? [],
    })
    start = next
  }
  return buckets
}

// number、duration 在最小值與最大值之間等分。區間為 ≥ 下限且 < 上限，最後一段不設上限。duration 的區間以秒數表示
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

  const buckets: Bucket<Row>[] = Array.from({ length: count }, (_, index) => {
    const low = min + index * width
    const last = index === count - 1
    const high = last ? max : min + (index + 1) * width
    return {
      label: count === 1 ? text(low) : `${text(low)} ～ ${text(high)}`,
      filter: { key: column.key, condition: { segment: last ? { min: low } : { min: low, below: high } } },
      rows: [],
    }
  })
  for (const { row, value } of entries) {
    const index = width === 0 ? 0 : Math.min(Math.floor((value - min) / width), count - 1)
    buckets[index].rows.push(row)
  }
  return buckets
}

// select、boolean 等依值本身分組，每個出現過的值為一組，以值的字串為鍵
function valueBuckets<Row> (rows: readonly Row[], column: AnyColumn, blank: Row[]): Map<string, Bucket<Row>> {
  const buckets = new Map<string, Bucket<Row>>()
  for (const row of rows) {
    const value = (row as Cell)[column.key]
    if (isEmpty(value)) {
      blank.push(row)
      continue
    }
    const id = String(value)
    const bucket = buckets.get(id) ?? valueBucket<Row>(column, id)
    bucket.rows.push(row)
    buckets.set(id, bucket)
  }
  return buckets
}

function valueBucket<Row> (column: AnyColumn, id: string): Bucket<Row> {
  return {
    label: column.type === 'boolean' ? booleanText(id === 'true') : id,
    filter: { key: column.key, condition: { values: [id] } },
    rows: [],
  }
}

// 沒有列也要成為一組的值：select 的 options，boolean 的否與是
function declaredValues (column: AnyColumn): string[] {
  if (column.type === 'select') {
    return column.options
  }
  return column.type === 'boolean' ? ['false', 'true'] : []
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
    // 宣告的值依宣告的順序在前，其餘的值以各組的第一列交給 sortRows，排序規則與列表相同。降序時反轉
    const found = valueBuckets(rows, column, blank)
    const declared = declaredValues(column)
    const byFirstRow = new Map([...found].filter(([id]) => !declared.includes(id)).map(([, bucket]) => [bucket.rows[0], bucket]))
    buckets = [
      ...declared.map(id => found.get(id) ?? valueBucket<Row>(column, id)),
      ...sortRows([...byFirstRow.keys()], schema, [{ key: column.key, direction: 'asc' }]).map(row => byFirstRow.get(row)!),
    ]
    if (direction === 'desc') {
      buckets.reverse()
    }
  }

  if (blank.length > 0 && !group.excludeBlank) {
    buckets.push({ label: BLANK_LABEL, colorKey: 'chartBlank', filter: { key: column.key, condition: { values: [null] } }, rows: blank })
  }
  return buckets
}

// 合併多組為「其他」。各組皆以 values 表示時合併各值，否則沒有條件
function mergeOther<Row> (buckets: Bucket<Row>[], key: string): Bucket<Row> {
  const values = buckets.flatMap(bucket => bucket.filter?.condition.values ?? [undefined])
  return {
    label: OTHER_LABEL,
    colorKey: 'chartOthers',
    filter: values.includes(undefined) ? null : { key, condition: { values: values as (string | null)[] } },
    rows: buckets.flatMap(bucket => bucket.rows),
  }
}

// 一組列的統計值。沒有列時 count 與 sum 為 0，avg、min、max 為 null
function statOf<Row> (rows: readonly Row[], value: Value, column: AnyColumn | undefined, context: StatContext<Row>): number | null {
  if (typeof value.stat === 'function') {
    return value.stat(rows, context)
  }
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
  if (typeof value.stat === 'function') {
    return value.label
  }
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
function orderAndLimit<Row> (buckets: Bucket<Row>[], input: GroupedInput, rank: (bucket: Bucket<Row>) => number, key: string): Bucket<Row>[] {
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
  const format = value as StatFormat
  const percent = 'percent' in value && Boolean(value.percent)
  let unit: ChartUnit = 'number'
  if (percent) {
    unit = 'percent'
  } else if (value.unit) {
    unit = value.unit
  } else if (column) {
    unit = unitOf(column)
  }

  const cells = (series?.buckets ?? [undefined]).map(seriesBucket => {
    const groups = buckets.map(bucket => seriesBucket ? bucket.rows.filter(row => series?.of.get(row) === seriesBucket) : bucket.rows)
    return groups.map((rows, index) => ({ rows, stat: statOf(rows, value, column, { index, groups }) }))
  })
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

    const seriesBucket = series?.buckets[seriesIndex]
    const name = (seriesName: string) => options.multiple ? `${label}（${seriesName}）` : seriesName
    return {
      label: seriesBucket ? name(seriesBucket.label) : label,
      colorKey: seriesBucket ? name(seriesBucket.colorKey ?? seriesBucket.label) : label,
      data,
      unit,
      ...(mixed.type ? { type: mixed.type } : {}),
      ...(mixed.axis ? { axis: mixed.axis } : {}),
      ...(series ? { series: seriesIndex } : {}),
      ...(format.sign ? { sign: true } : {}),
      ...(format.suffix === undefined ? {} : { suffix: format.suffix }),
      ...(format.textColor ? { textColor: format.textColor } : {}),
    }
  })
}

// 依 group 分組。沒有 group 時（只有 stat），全部的列為一組，名稱為空字串。分組欄不存在時為 null
function categoryBuckets<Row> (schema: TableSchema, input: CategoryInput, rows: readonly Row[], rankOf: (buckets: Bucket<Row>[]) => (bucket: Bucket<Row>) => number): Bucket<Row>[] | null {
  if (!input.group) {
    return [{ label: '', filter: null, rows: [...rows] }]
  }
  const groupColumn = findColumn(schema, input.group.key)
  if (!groupColumn) {
    return null
  }
  const buckets = groupBuckets(schema, rows, groupColumn, input.group)
  return orderAndLimit(buckets, input as GroupedInput, rankOf(buckets), groupColumn.key)
}

function computeCategory<Row> (schema: TableSchema, input: CategoryInput, rows: readonly Row[]): ChartData<Row> {
  const values = input.values as Value[]
  const columns = values.map(value => value.key ? findColumn(schema, value.key) : undefined)
  // 排序與 limit 依第一個數值。自訂的統計此時依分組本身的順序取得 index 與 groups。只在用到時計算
  const rankOf = (unordered: Bucket<Row>[]) => {
    let ranks: Map<Bucket<Row>, number> | undefined
    return (bucket: Bucket<Row>) => {
      if (!ranks) {
        const groups = unordered.map(item => item.rows)
        ranks = new Map(unordered.map((item, index) => [item, statOf(item.rows, values[0], columns[0], { index, groups }) ?? -Infinity]))
      }
      return ranks.get(bucket) ?? -Infinity
    }
  }
  const buckets = categoryBuckets(schema, input, rows, rankOf)
  if (!buckets) {
    return { kind: 'category', labels: [], datasets: [], groups: [], series: [] }
  }

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
    groups: buckets.map(bucket => groupData(bucket)),
    series: series?.buckets.map(bucket => groupData(bucket)) ?? [],
  }
}

function computePoints<Row> (schema: TableSchema, input: ScatterChart<AnyRow> | BubbleChart<AnyRow>, rows: readonly Row[]): ChartData<Row> {
  const xColumn = findColumn(schema, input.x)
  const yColumn = findColumn(schema, input.y)
  const rColumn = input.type === 'bubble' ? findColumn(schema, input.r) : undefined
  const seriesColumn = input.series ? findColumn(schema, input.series.key) : undefined
  if (!xColumn || !yColumn) {
    return { kind: 'point', datasets: [], series: [], xUnit: 'number', yUnit: 'number' }
  }

  const points = (list: readonly Row[]) => list.flatMap(row => {
    const x = toNumber((row as Cell)[xColumn.key], xColumn)
    const y = toNumber((row as Cell)[yColumn.key], yColumn)
    const r = rColumn ? toNumber((row as Cell)[rColumn.key], rColumn) : undefined
    return x === null || y === null || r === null ? [] : [{ x, y, ...(r === undefined ? {} : { r }), row }]
  })

  // 沒有任何點的組不列入，圖例不出現
  const buckets = input.series && seriesColumn ? groupBuckets(schema, rows, seriesColumn, input.series) : []
  const datasets = seriesColumn
    ? buckets
        .map((bucket, index) => ({ label: bucket.label, colorKey: bucket.colorKey ?? bucket.label, data: points(bucket.rows), series: index }))
        .filter(dataset => dataset.data.length > 0)
    : [{ label: schema.tableLabel, colorKey: schema.tableLabel, data: points(rows) }]
  return {
    kind: 'point',
    datasets,
    series: buckets.map(bucket => groupData(bucket)),
    xUnit: unitOf(xColumn),
    yUnit: unitOf(yColumn),
  }
}

export function defineChart<Row extends object> (schema: TableSchema<Row>, input: ChartInput<Row>): ChartDefinition<Row> {
  if (import.meta.env.DEV) {
    checkInput(schema, input as LooseInput)
  }

  const spec = input as AnyChartInput
  const isPoint = spec.type === 'scatter' || spec.type === 'bubble'
  const groupKey = isPoint ? null : spec.group?.key ?? null
  const seriesKey = 'series' in spec ? spec.series?.key ?? null : null
  return {
    type: spec.type,
    stacked: 'stacked' in spec && Boolean(spec.stacked),
    horizontal: 'horizontal' in spec && Boolean(spec.horizontal),
    groupKey,
    seriesKey,
    filterKeys: [groupKey, seriesKey].filter((key): key is string => key !== null),
    colors: spec.colors ?? {},
    compute: rows => spec.type === 'scatter' || spec.type === 'bubble'
      ? computePoints(schema, spec, rows)
      : computeCategory(schema, spec, rows),
  }
}
