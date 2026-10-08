import type { RowBase, RowKey } from './types'
import type { PageAction } from '@/composables/actions/useTableActions'

// 視圖：一列資料的哪些欄位放到版面的哪個位置，加上這一列的動作。定義在頁面、交給版面元件（見 ROADMAP 的「頁面類型」）

// schema 的欄位，加上每列都有的系統成員（id、$label）
type ViewKey<Row extends object> = RowKey<Row> | keyof RowBase

// 一組位置。沒給的位置就是空的；要組合多個欄位就宣告成 virtualColumns
export interface FieldGroup<Row extends object> {
  title?: ViewKey<Row>
  subtitle?: ViewKey<Row>
  image?: ViewKey<Row>
  summary?: ViewKey<Row>
  // 只有 deck 用：右下角
  aside?: ViewKey<Row>
}

// 依位置排：card 與 detail 標頭的前兩個在左、後兩個在右，null 是空位；deck 與 profile 會跳過空位
export type RowActions<Row extends object> = (row: Row) => (PageAction | null)[]

interface ResolvedGroup {
  title: string
  subtitle: string
  image: string | null
  summary: string
  aside: string
}

// defineView 的結果：給一列，回傳各位置的內容與這一列的動作（deck、profile、gallery、detail 標頭）
export type RowView<Row extends object> = (row: Row) => ResolvedGroup & { actions: (PageAction | null)[] }

// defineCardView 的結果：header 是第 1 層（image 當頭像），body 是第 2、3 層（image 當大圖），actions 是第 4 層
export type CardView<Row extends object> = (row: Row) => {
  header: ResolvedGroup
  body: ResolvedGroup
  actions: (PageAction | null)[]
}
