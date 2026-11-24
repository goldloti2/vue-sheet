<script generic="Row extends object" lang="ts" setup>
  import type { FieldActions, PageAction } from '@/composables/actions/useTableActions'
  import type { DetailFieldLayout } from '@/config/app'
  import type { TableKey } from '@/schema'
  import type { DisplayValue } from '@/schema/format'
  import type { AnyTableSchema, RowKey, SchemaColumn } from '@/schema/types'
  import { computed } from 'vue'
  import DetailField from '@/components/ui/record/DetailField.vue'
  import InlineField from '@/components/ui/record/InlineField.vue'
  import { schemas } from '@/schema'
  import { displayValue } from '@/schema/format'
  import { imageSrc } from '@/schema/image'
  import { isRealTable } from '@/schema/relations'
  import { allColumns, isVirtualSchema } from '@/schema/types'

  interface Field {
    key: string
    label: string
    value: DisplayValue
    image?: string | null
    action?: PageAction | null
    multiline?: boolean
    // 只有快速編輯的欄位有
    editColumn?: SchemaColumn
  }

  const props = defineProps<{
    table: TableKey
    // null 時只顯示欄位名稱，值留白
    row: Row | null
    // 這一頁的欄位順序，覆寫 schema 的 detailOrder
    order?: readonly RowKey<Row>[]
    // 欄位 key → 動作，每一欄一個。未列出的欄位沒有動作，前往 ref 的父列也須列出（goToRefAction）
    fieldActions?: FieldActions<Row>
    // 快速編輯：這些欄位直接顯示為輸入元件，修改後即寫入。主鍵、虛擬欄位與虛擬表列入也不能編輯
    editable?: readonly RowKey<Row>[]
    // 名稱與值左右並排或上下兩行。省略時依 config/app.ts 的 detailFieldLayout
    layout?: DetailFieldLayout
  }>()

  const schema = computed<AnyTableSchema>(() => schemas[props.table])

  // 寫入的表，虛擬表不可寫入
  const writeTable = computed(() => isRealTable(props.table) ? props.table : undefined)

  // 快速編輯所用的 schema，虛擬表為 null
  const editSchema = computed(() => isVirtualSchema(schema.value) ? null : schema.value)

  function editColumnOf (key: string): SchemaColumn | undefined {
    const schema = editSchema.value
    if (!writeTable.value || !schema || key === schema.idColumn || !(props.editable as readonly string[] | undefined)?.includes(key)) {
      return undefined
    }
    return schema.columns.find(column => column.key === key)
  }

  function actionOf (key: string, row: Row): PageAction | null | undefined {
    const actions = props.fieldActions as Record<string, ((row: Row) => PageAction | null) | undefined> | undefined
    return actions?.[key]?.(row)
  }

  // 真實與虛擬欄位依 order（省略時為 detailOrder）排列。showIf 不成立的欄位不顯示，row 為 null 時一律顯示
  const fields = computed<Field[]>(() => {
    const row = props.row
    const columns = allColumns(schema.value).filter(column => !row || !column.showIf || column.showIf(row))

    const fieldList: Field[] = columns.map(column => row
      ? {
        key: column.key,
        label: column.label,
        value: displayValue(row, schema.value, column),
        image: column.type === 'image' ? imageSrc((row as Record<string, unknown>)[column.key]) : null,
        action: actionOf(column.key, row),
        multiline: column.type === 'text' && Boolean(column.multiline),
        editColumn: editColumnOf(column.key),
      }
      : { key: column.key, label: column.label, value: { text: '' } })

    const order: readonly string[] | undefined = props.order ?? schema.value.detailOrder
    if (!order) {
      return fieldList
    }

    return order
      .map(key => fieldList.find(candidate => candidate.key === key))
      .filter((candidate): candidate is Field => candidate !== undefined)
  })

  // 切換到另一列時，快速編輯的欄位重新建立，未寫入的值先寫回原本那一列
  const rowId = computed(() => (props.row as { id?: string } | null)?.id ?? '')
</script>

<template>
  <v-container>
    <template v-for="field in fields" :key="field.key">
      <DetailField
        v-if="field.editColumn && editSchema && writeTable && row"
        :action="field.action"
        :label="field.label"
        :layout="layout"
        :value="field.value"
      >
        <template #value>
          <InlineField
            :key="rowId"
            :column="field.editColumn"
            :row="row as { id: string }"
            :schema="editSchema"
            :table="writeTable"
          />
        </template>
      </DetailField>

      <DetailField
        v-else
        :action="field.action"
        :image="field.image"
        :label="field.label"
        :layout="layout"
        :multiline="field.multiline"
        :value="field.value"
      />
    </template>
  </v-container>
</template>
