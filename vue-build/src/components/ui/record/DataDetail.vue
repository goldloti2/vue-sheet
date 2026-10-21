<script generic="Row extends object" lang="ts" setup>
  import type { FieldActions, PageAction } from '@/composables/actions/useTableActions'
  import type { TableKey } from '@/schema'
  import type { RowKey, SchemaColumn, TableSchema } from '@/schema/types'
  import { computed } from 'vue'
  import DetailField from '@/components/ui/record/DetailField.vue'
  import InlineField from '@/components/ui/record/InlineField.vue'
  import { schemas } from '@/schema'
  import { imageSrc } from '@/schema/image'
  import { allColumns, formatColumnValue } from '@/schema/types'

  interface Field {
    key: string
    label: string
    value: string
    image?: string | null
    action?: PageAction | null
    // 快速編輯的欄位才有
    editColumn?: SchemaColumn
  }

  const props = defineProps<{
    schema: TableSchema
    // null 時只顯示欄位名稱，值留白
    row: Row | null
    // 這一頁的欄位順序，覆寫 schema 的 detailOrder
    order?: readonly RowKey<Row>[]
    // 欄位 key → 動作，每欄一個。沒列的欄位就沒有動作，ref 的前往也要自己列（goToRefAction）
    fieldActions?: FieldActions<Row>
    // 快速編輯：這些欄位直接是輸入元件，改了即寫入；主鍵與虛擬欄位列了也不能編輯
    editable?: readonly RowKey<Row>[]
  }>()

  // 寫入要用表的代稱。只拿到 schema，從 schemas 反查（schema 物件是單例）
  const table = (Object.keys(schemas) as TableKey[]).find(key => schemas[key] === props.schema)

  function editColumnOf (key: string): SchemaColumn | undefined {
    if (!table || key === props.schema.idColumn || !(props.editable as readonly string[] | undefined)?.includes(key)) {
      return undefined
    }
    return props.schema.columns.find(column => column.key === key)
  }

  // 真實與虛擬欄位一視同仁，照 order（省略時為 detailOrder）排；showIf 不成立的欄位不顯示，row 為 null 時一律顯示
  const fields = computed<Field[]>(() => {
    const row = props.row
    const columns = allColumns(props.schema).filter(column => !row || !column.showIf || column.showIf(row))

    const fieldList: Field[] = columns.map(column => row
      ? {
        key: column.key,
        label: column.label,
        value: formatColumnValue(row, column),
        image: column.type === 'image' ? imageSrc((row as Record<string, unknown>)[column.key]) : null,
        action: props.fieldActions?.[column.key]?.(row),
        editColumn: editColumnOf(column.key),
      }
      : { key: column.key, label: column.label, value: '' })

    const order: readonly string[] | undefined = props.order ?? props.schema.detailOrder
    if (!order) {
      return fieldList
    }

    return order
      .map(key => fieldList.find(candidate => candidate.key === key))
      .filter((candidate): candidate is Field => candidate !== undefined)
  })

  // 換到另一筆時快速編輯的欄位重新建立，未寫入的值先寫回原本那一筆
  const rowId = computed(() => (props.row as { id?: string } | null)?.id ?? '')
</script>

<template>
  <v-container>
    <template v-for="field in fields" :key="field.key">
      <DetailField
        v-if="field.editColumn && table && row"
        :action="field.action"
        :label="field.label"
        :value="field.value"
      >
        <template #value>
          <InlineField
            :key="rowId"
            :column="field.editColumn"
            :row="row as { id: string }"
            :schema="schema"
            :table="table"
          />
        </template>
      </DetailField>

      <DetailField
        v-else
        :action="field.action"
        :image="field.image"
        :label="field.label"
        :value="field.value"
      />
    </template>
  </v-container>
</template>
