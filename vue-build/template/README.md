# 範本（template/）

複製 → 改名 → 填空。這個資料夾**不在 `src/` 底下**，不會被 build／eslint／vue-tsc 掃到，所以裡面的檔案不用能編譯，也不會影響正式程式碼。

> 這裡只寫**要複製哪些檔、要改哪幾處**。框架怎麼運作、有哪些選項一律看文件，每個範本檔開頭也標了該看哪一份：
>
> | 想知道 | 看哪裡 |
> | --- | --- |
> | 欄位型別、驗證、初始值、虛擬欄位、跨表關聯 | [docs/schema.md](../docs/schema.md) |
> | 動作擺哪裡、搜尋與篩選、列表與多選 | [docs/ui.md](../docs/ui.md) |
> | 某個元件的 props 與注意事項 | [docs/components/](../docs/components/) |
> | KeepAlive 的規則、連續動作、快速編輯對話框 | [docs/architecture.md](../docs/architecture.md) |
> | 資料何時寫回 Sheet、推送與同步 | [docs/store.md](../docs/store.md) |

## 佔位字串

所有範本統一用這兩個標記當佔位符，複製後整份檔案 find-replace 就好：

| 佔位 | 換成 | 例子 |
| --- | --- | --- |
| `__table__` | 表的代稱（`schemas` 的 key、路由路徑、檔名） | `order` |
| `__Table__` | 該表的 PascalCase 前綴（型別、函式名） | `Order` |

`__Table__Row` → `OrderRow`、`__table__Schema` → `orderSchema`、`use__Table__Actions` → `useOrderActions`，兩次取代全部搞定。

> 刻意用 `__table__` 這種不像英文字的標記，而不是 `template` 這類真實單字——後者會連 Vue 的 `<template>` 標籤一起被取代，整個頁面就毀了。

複製時記得順手刪掉每個檔案開頭那段 `複製到 ...` 的註解。

---

## 0. 初次設定

拿這個框架開新專案時先改這幾處：

| 檔案 | 改什麼 |
| --- | --- |
| `src/config/app.ts` | `appName`：App 名稱，沒指定 `route.meta.title` 的頁面用它當標題 |
| `index.html` | `<title>` 寫同一個名字（靜態 HTML 讀不到 TS，只能各寫一次）；`lang` 依介面語言 |
| `src/config/navigation.ts` | 導覽列項目，隨表增減（見下面第 1 節） |

---

## 1. 新增一張表

### 要複製的檔案

| 範本 | 複製到 | 說明 |
| --- | --- | --- |
| `table/schema.ts` | `src/schema/__table__.ts` | 欄位定義、排序、顯示順序 |
| `table/use__Table__Actions.ts` | `src/composables/actions/use__Table__Actions.ts` | 該表的新增／編輯／刪除動作集合 |
| `pages/list.vue` | `src/pages/__table__/index.vue` | 列表頁 → `/__table__` |
| `pages/detail.vue` | `src/pages/__table__/[id]/index.vue` | 詳細頁 → `/__table__/:id` |
| `pages/new.vue` | `src/pages/__table__/new.vue` | 新增表單 → `/__table__/new` |
| `pages/edit.vue` | `src/pages/__table__/[id]/edit.vue` | 編輯表單 → `/__table__/:id/edit` |

> 路由是檔案式的（unplugin-vue-router），放進 `pages/` 就自動生效，不用維護路由表。
> 注意：同一個 `:id` 一律用 `[id]/index.vue` + `[id]/edit.vue` 的**資料夾**寫法，不要用 `[id].vue`。

### 要改的既有檔案（4 處）

1. **`src/schema/index.ts`** — 註冊 schema，`TableKey` 會自動多一個值：
   ```ts
   import { __table__Schema } from './__table__'

   export const schemas = {
     __table__: __table__Schema,
   }
   ```

2. **`src/services/mock/tables.ts`** — 註冊 mock CSV（後端接上後整個 `mock/` 資料夾會刪掉）：
   ```ts
   import __table__Csv from '../../../mock/__table__-test.csv?raw'

   export const mockCsv: Partial<Record<TableKey, string>> = {
     __table__: __table__Csv,
   }
   ```

3. **`mock/__table__-test.csv`** — 新建。第一列是 Sheet 表頭（對外名稱），要跟 schema 的 `sheetHeader`／`label` 對得起來，並且包含 `idColumn` 那一欄。

4. **`src/config/navigation.ts`** — 要進導覽列才加：
   ```ts
   { title: '範本', icon: mdiLabel, to: '/__table__' }
   ```

### 先寫 Row 介面，再宣告 schema

`TableSchema<__Table__Row>` 會拿介面去檢查：欄位 `key`、`labelColumn`、`detailOrder`、`defaultSort` 打錯字直接紅字，`type` 跟值的型別對不上也會抓，虛擬欄位 `value` 的 `row` 不用轉型。介面裡要自己補 store 會掛上去的東西——虛擬欄位的 `readonly xxx`，以及每個 ref 欄位的 `readonly $欄位key?: 對方Row`（`value` 裡要讀父列才需要）。

---

## 2. 不用自己寫的東西

新增一張表時最常「以為要自己做」的幾件，其實框架都接好了：

- **路由**：檔案即路由，不用註冊
- **跨表關聯**：schema 欄位標 `{ type: 'ref', refTable: '另一張表' }` 就完成，兩邊的列自動掛 getter、關聯的表自動一起載
- **表單**：欄位型別決定輸入元件，取消／送出與「要不要放棄」都由 `useCreateForm`／`useEditForm` 處理
- **搜尋與篩選**：`useListPage(table, schema)` 一行接好，放大鏡與篩選抽屜自動出現（欄位要標 `searchable`）
- **載入中／載入失敗／找不到資料**：版型元件（`ListPage`／`DetailPage`／`FormPage`）內建
- **確認框、問欄位對話框、snackbar**：`AppShell` 各掛一個實例，頁面直接叫 `confirm()`／`askFields()`／`notify()`
