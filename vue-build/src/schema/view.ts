import type { DisplayValue } from './format'
import type { RowBase, RowKey, TableSchema } from './types'
import type { PageAction } from '@/composables/actions/useTableActions'
import { displayValue } from './format'
import { imageSrc } from './image'
import { findColumn } from './types'

// 視圖：一列的欄位置於版面的哪個位置，以及此列的動作。於頁面定義，交給版面元件（見 ROADMAP 的「頁面類型（對照 AppSheet）」）

// schema 的欄位，以及每列皆有的系統成員（id、$label）
type ViewKey<Row extends object> = RowKey<Row> | Exclude<keyof RowBase, '$table'>

// 一組位置。未指定的位置為空。組合多個欄位時宣告為 virtualColumns
interface FieldGroup<Row extends object> {
  title?: ViewKey<Row>
  subtitle?: ViewKey<Row>
  image?: ViewKey<Row>
  summary?: ViewKey<Row>
  // 只用於 deck：右下角
  aside?: ViewKey<Row>
}

// 依位置排列：card 與詳細頁標頭的前兩個在左，後兩個在右，null 為空位。deck 與 profile 略過空位
type RowActions<Row extends object> = (row: Row) => (PageAction | null)[]

// 未指定的位置為 undefined，版面不顯示。已指定但沒有值時，文字為 ''，圖片為 null，版面保留位置
interface ResolvedGroup {
  title?: DisplayValue
  subtitle?: DisplayValue
  image?: string | null
  summary?: DisplayValue
  aside?: DisplayValue
}

// defineView 的結果：接收一列並回傳各位置的內容與此列的動作（deck、profile、gallery、詳細頁標頭）
export type RowView<Row extends object> = (row: Row) => ResolvedGroup & { actions: (PageAction | null)[] }

// defineCardView 的結果：header 為第 1 層（image 為頭像），body 為第 2、3 層（image 為大圖），actions 為第 4 層
export type CardView<Row extends object> = (row: Row) => {
  header: ResolvedGroup
  body: ResolvedGroup
  actions: (PageAction | null)[]
}

function noActions (): (PageAction | null)[] {
  return []
}

// 欄位於建立時查找，之後每一列只讀值與格式化。schema 未定義的成員（id、$label）直接轉為字串，不套用條件式格式
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
