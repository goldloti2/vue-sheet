import type { DisplayValue } from './format'
import type { RowBase, RowKey, TableSchema } from './types'
import type { PageAction } from '@/composables/actions/useTableActions'
import { displayValue } from './format'
import { imageSrc } from './image'
import { findColumn } from './types'

// 視圖：一列資料的哪些欄位放到版面的哪個位置，加上這一列的動作。定義在頁面、交給版面元件（見 ROADMAP 的「頁面類型（對照 AppSheet）」）

// schema 的欄位，加上每列都有的系統成員（id、$label）
type ViewKey<Row extends object> = RowKey<Row> | keyof RowBase

// 一組位置。沒給的位置就是空的；要組合多個欄位就宣告成 virtualColumns
interface FieldGroup<Row extends object> {
  title?: ViewKey<Row>
  subtitle?: ViewKey<Row>
  image?: ViewKey<Row>
  summary?: ViewKey<Row>
  // 只有 deck 用：右下角
  aside?: ViewKey<Row>
}

// 依位置排：card 與 detail 標頭的前兩個在左、後兩個在右，null 是空位；deck 與 profile 會跳過空位
type RowActions<Row extends object> = (row: Row) => (PageAction | null)[]

// 沒指定的位置為 undefined，版面不畫；指定了但沒有值的文字為 text ''、圖片為 null，版面保留它的位置。
// 文字位置帶著條件式格式（DisplayValue），以 FormattedValue 畫出
interface ResolvedGroup {
  title?: DisplayValue
  subtitle?: DisplayValue
  image?: string | null
  summary?: DisplayValue
  aside?: DisplayValue
}

// defineView 的結果：給一列，回傳各位置的內容與這一列的動作（deck、profile、gallery、detail 標頭）
export type RowView<Row extends object> = (row: Row) => ResolvedGroup & { actions: (PageAction | null)[] }

// defineCardView 的結果：header 是第 1 層（image 當頭像），body 是第 2、3 層（image 當大圖），actions 是第 4 層
export type CardView<Row extends object> = (row: Row) => {
  header: ResolvedGroup
  body: ResolvedGroup
  actions: (PageAction | null)[]
}

function noActions (): (PageAction | null)[] {
  return []
}

// 欄位在建立時查好，之後每一列只剩讀值與格式化。schema 沒定義的（id、$label）直接轉字串，沒有條件式格式
function textReader (schema: TableSchema, key: string | undefined): (row: object) => DisplayValue | undefined {
  if (!key) {
    return () => undefined
  }
  const column = findColumn(schema, key)
  if (column) {
    return row => displayValue(row, schema, column)
  }
  return row => {
    const value = (row as Record<string, unknown>)[key]
    return { text: value === null || value === undefined ? '' : String(value) }
  }
}

function imageReader (key: string | undefined): (row: object) => string | null | undefined {
  if (!key) {
    return () => undefined
  }
  return row => imageSrc((row as Record<string, unknown>)[key])
}

function compileGroup<Row extends object> (schema: TableSchema, group: FieldGroup<Row> = {}): (row: Row) => ResolvedGroup {
  const title = textReader(schema, group.title)
  const subtitle = textReader(schema, group.subtitle)
  const image = imageReader(group.image)
  const summary = textReader(schema, group.summary)
  const aside = textReader(schema, group.aside)

  return row => ({ title: title(row), subtitle: subtitle(row), image: image(row), summary: summary(row), aside: aside(row) })
}

export function defineView<Row extends object> (
  schema: TableSchema<Row>,
  view: FieldGroup<Row> & { actions?: RowActions<Row> },
): RowView<Row> {
  const group = compileGroup(schema, view)
  const actions = view.actions ?? noActions
  return row => ({ ...group(row), actions: actions(row) })
}

export function defineCardView<Row extends object> (
  schema: TableSchema<Row>,
  view: { header?: FieldGroup<Row>, body?: FieldGroup<Row>, actions?: RowActions<Row> },
): CardView<Row> {
  const header = compileGroup(schema, view.header)
  const body = compileGroup(schema, view.body)
  const actions = view.actions ?? noActions
  return row => ({ header: header(row), body: body(row), actions: actions(row) })
}
