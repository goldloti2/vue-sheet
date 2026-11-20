<script lang="ts" setup>
  import type { SchemaEdit } from '../../../shared/schema'
  import type { KeyList } from '../../../shared/schemaForm'
  import { mdiPlaylistRemove, mdiPlus } from '@mdi/js'
  import { computed, inject, shallowRef } from 'vue'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import { literalText } from '../../../shared/schema'
  import { columnOptions, columnRows, KEY_LISTS, keyListItems, propertyBefore, sortItems } from '../../../shared/schemaForm'
  import ItemList from './ItemList.vue'

  type ListName = KeyList | 'defaultSort'

  const form = inject(SCHEMA_FORM_KEY)!

  const TITLES: Record<ListName, string> = {
    searchable: '可搜尋',
    sortable: '可排序',
    detailOrder: '詳細頁順序',
    formOrder: '表單頁順序',
    defaultSort: '預設排序',
  }

  // 省略時的行為
  const OMITTED: Record<ListName, string> = {
    searchable: '省略（沒有可搜尋或篩選欄位）',
    sortable: '省略（沒有可排序欄位）',
    detailOrder: '省略（依 columns 順序）',
    formOrder: '省略（依 columns 順序）',
    defaultSort: '省略（維持 Sheet 原始順序）',
  }

  const NAMES: readonly ListName[] = [...KEY_LISTS, 'defaultSort']
  // 虛擬表沒有表單，不顯示 formOrder
  const names = computed(() => form.model.value?.virtual ? NAMES.filter(name => name !== 'formOrder') : NAMES)

  const selected = shallowRef<ListName>('searchable')
  const columns = computed(() => columnOptions(columnRows(form.model.value)))
  // 欄位的 key 對應標籤
  const labels = computed(() => Object.fromEntries(columns.value.map(column => [column.value, column.title])))

  // 目前的清單。不存在時 items 為 null，不是以字面值寫成時為 undefined
  const current = computed(() => {
    const name = selected.value
    if (name === 'defaultSort') {
      const sorts = sortItems(form.model.value)
      return { name, items: sorts && sorts.map(item => item.key), directions: sorts?.map(item => item.direction) }
    }
    return { name, items: keyListItems(form.model.value, name), directions: undefined }
  })

  // 尚未列入目前清單的欄位
  const options = computed(() => columns.value.filter(column => !current.value.items?.includes(column.value)))

  // 左邊只標示省略與以程式碼寫成的清單
  const summaries = computed(() => Object.fromEntries(NAMES.map(name => {
    const items = name === 'defaultSort' ? sortItems(form.model.value) : keyListItems(form.model.value, name)
    if (items === undefined) {
      return [name, '以程式碼寫成']
    }
    return [name, items === null ? '省略' : '']
  })) as Record<ListName, string>)

  function apply (edits: SchemaEdit[]): Promise<void> {
    return form.applyOrNotify(edits, 'soon')
  }

  // 清單不存在時先建立空清單。defaultSort 的新項目為升冪
  function add (key: string): void {
    const { name, items } = current.value
    const create: SchemaEdit[] = items === null ? [{ kind: 'setProperty', objectPath: [], name, valueText: '[]', after: propertyBefore(form.model.value, name) }] : []
    const itemText = name === 'defaultSort' ? `{ key: ${literalText(key)}, direction: 'asc' }` : literalText(key)
    void apply([...create, { kind: 'insert', arrayPath: [name], index: Number.MAX_SAFE_INTEGER, itemText, multiline: name === 'defaultSort' }])
  }

  function toggle (index: number): void {
    const direction = current.value.directions?.[index] === 'asc' ? 'desc' : 'asc'
    void apply([{ kind: 'replace', path: ['defaultSort', index, 'direction'], valueText: literalText(direction) }])
  }
</script>

<template>
  <div class="schema-lists">
    <v-list class="schema-lists__names py-0" density="compact">
      <v-list-item
        v-for="name in names"
        :key="name"
        :active="name === selected"
        color="primary"
        @click="selected = name"
      >
        <v-list-item-title class="schema-lists__name">{{ TITLES[name] }}</v-list-item-title>
        <v-list-item-subtitle v-if="summaries[name]" class="text-caption">{{ summaries[name] }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>

    <div class="schema-lists__content">
      <div v-if="current.items === undefined" class="schema-lists__note text-medium-emphasis">以程式碼寫成，請以文字編輯</div>

      <template v-else>
        <div v-if="current.items === null" class="schema-lists__note text-medium-emphasis">{{ OMITTED[current.name] }}</div>

        <div class="schema-lists__body">
          <ItemList
            :key="current.name"
            class="schema-lists__list"
            :directions="current.directions"
            :items="current.items ?? []"
            :labels="labels"
            :move="(from, to) => apply([{ kind: 'move', arrayPath: [current.name], from, to }])"
            @remove="index => apply([{ kind: 'remove', arrayPath: [current.name], index }])"
            @toggle="toggle"
          />

          <div class="schema-lists__actions">
            <v-menu>
              <template #activator="{ props: activator }">
                <v-btn
                  v-bind="activator"
                  :disabled="options.length === 0"
                  :prepend-icon="mdiPlus"
                  text="加入"
                  variant="outlined"
                />
              </template>

              <v-list density="compact">
                <v-list-item v-for="option in options" :key="option.value" :title="option.title" @click="add(option.value)" />
              </v-list>
            </v-menu>

            <v-btn
              v-if="current.items !== null"
              :prepend-icon="mdiPlaylistRemove"
              text="省略"
              variant="outlined"
              @click="apply([{ kind: 'setProperty', objectPath: [], name: current.name, valueText: null }])"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* 左邊選擇清單，右邊編輯所選的清單 */
.schema-lists {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  min-height: 100%;
}

.schema-lists__names {
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* 字體與條件式格式的規則相同 */
.schema-lists__name {
  font-size: 0.8125rem;
  font-weight: 400;
  letter-spacing: normal;
}

.schema-lists__content {
  padding: 8px 16px;
}

.schema-lists__body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.schema-lists__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.schema-lists__list {
  width: 360px;
  max-width: 100%;
}

.schema-lists__note {
  padding: 6px 0;
  font-size: 0.75rem;
}
</style>
