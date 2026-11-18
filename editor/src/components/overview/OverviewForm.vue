<script lang="ts" setup>
  import type { OverviewRow, TableFiles } from '../../../shared/overview'
  import { mdiDragVertical } from '@mdi/js'
  import { computed } from 'vue'
  import { useDragSort } from '@/composables/useDragSort'
  import { useRegistryForm } from '@/composables/useRegistryForm'
  import { useFilesStore } from '@/stores/files'
  import { overviewRows } from '../../../shared/overview'

  const props = defineProps<{
    path: string
    text: string
  }>()

  const files = useFilesStore()
  const form = useRegistryForm(() => props.path, () => props.text)

  const rows = computed(() => form.model.value
    ? overviewRows(form.model.value, { paths: files.paths, tables: files.tables, mockCsv: files.mockCsv })
    : [])
  const registered = computed(() => rows.value.filter(row => row.index !== null))
  const unregistered = computed(() => rows.value.filter(row => row.index === null))

  const FILE_TITLES: [keyof TableFiles, string][] = [
    ['schema', 'schema'],
    ['actions', '動作'],
    ['pages', '頁面'],
    ['csv', 'CSV'],
  ]

  // 只有登記的表可以拖曳
  const sort = useDragSort({
    items: () => registered.value,
    source: () => form.model.value,
    commit: (from, to) => form.apply([{ kind: 'move', from, to }]),
  })

  function startDrag (event: DragEvent, index: number): void {
    sort.start(event, index, (event.target as HTMLElement).closest('tr'))
  }

  // 啟用即登記於 schemas 的最後，停用即從 schemas 刪除
  function setEnabled (row: OverviewRow, enabled: boolean): void {
    if (row.key === null) {
      return
    }
    if (enabled && row.variable !== null) {
      void form.apply([{ kind: 'add', key: row.key, variable: row.variable }])
    } else if (!enabled) {
      void form.apply([{ kind: 'remove', key: row.key }])
    }
  }

  function rowKey (row: OverviewRow): string {
    return row.key ?? `#${row.index}`
  }
</script>

<template>
  <div class="overview-form">
    <div v-if="form.model.value === undefined" class="overview-form__message text-medium-emphasis">讀取中</div>

    <div v-else-if="form.model.value === null" class="overview-form__message text-medium-emphasis">
      找不到 schemas 物件，請以文字編輯
    </div>

    <table v-else class="overview-form__table">
      <thead>
        <tr>
          <th />
          <th class="overview-form__center">啟用</th>
          <th>表名</th>
          <th>代號</th>
          <th>檔案</th>
        </tr>
      </thead>

      <TransitionGroup name="overview-form" tag="tbody" @drop="sort.drop">
        <tr
          v-for="({ item: row, index }, position) in sort.entries.value"
          :key="rowKey(row)"
          :class="{ 'overview-form__row--dragging': sort.dragging.value === index }"
          @dragover="sort.over($event, position)"
        >
          <td>
            <v-icon
              class="overview-form__handle"
              draggable="true"
              :icon="mdiDragVertical"
              size="18"
              @dragend="sort.end"
              @dragstart="startDrag($event, index)"
            />
          </td>

          <td class="overview-form__center">
            <v-switch
              color="primary"
              density="compact"
              :disabled="row.key === null"
              hide-details
              inset
              :model-value="true"
              @update:model-value="value => setEnabled(row, Boolean(value))"
            />
          </td>

          <template v-if="row.key !== null">
            <td>{{ row.label ?? row.key }}</td>
            <td class="overview-form__key">{{ row.key }}</td>

            <td>
              <span class="overview-form__files">
                <v-chip
                  v-for="[name, title] in FILE_TITLES"
                  :key="name"
                  :disabled="row.files[name] === null"
                  size="small"
                  :text="title"
                  variant="outlined"
                  @click="files.open(row.files[name]!)"
                />
              </span>
            </td>
          </template>

          <td v-else class="text-medium-emphasis" colspan="3">以程式碼寫成，請以文字編輯</td>
        </tr>
      </TransitionGroup>

      <tbody>
        <tr v-for="row in unregistered" :key="rowKey(row)" class="overview-form__row--disabled">
          <td />

          <td class="overview-form__center">
            <v-tooltip :disabled="row.variable !== null" location="end" text="找不到 schema 的變數名，請以文字編輯">
              <template #activator="{ props: tooltip }">
                <span v-bind="tooltip">
                  <v-switch
                    color="primary"
                    density="compact"
                    :disabled="row.variable === null"
                    hide-details
                    inset
                    :model-value="false"
                    @update:model-value="value => setEnabled(row, Boolean(value))"
                  />
                </span>
              </template>
            </v-tooltip>
          </td>

          <td>{{ row.label ?? row.key }}</td>
          <td class="overview-form__key">{{ row.key }}</td>

          <td>
            <span class="overview-form__files">
              <v-chip
                v-for="[name, title] in FILE_TITLES"
                :key="name"
                :disabled="row.files[name] === null"
                size="small"
                :text="title"
                variant="outlined"
                @click="files.open(row.files[name]!)"
              />
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.overview-form {
  height: 100%;
  overflow: auto;
}

.overview-form__message {
  padding: 16px;
}

.overview-form__table {
  min-width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.overview-form__table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 4px 8px;
  background: rgb(var(--v-theme-surface));
  font-weight: normal;
  text-align: left;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* 各格垂直置中 */
.overview-form__table td {
  height: 40px;
  padding: 0 8px;
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: nowrap;
  vertical-align: middle;
}

.overview-form__table .overview-form__center {
  text-align: center;
}

.overview-form__center :deep(.v-selection-control) {
  justify-content: center;
}

/* 開關縮為一半 */
.overview-form__center :deep(.v-switch) {
  transform: scale(0.5);
}

.overview-form__key {
  font-family: monospace;
}

.overview-form__files {
  display: inline-flex;
  gap: 4px;
}

.overview-form__handle {
  cursor: grab;
}

.overview-form__row--dragging {
  opacity: 0.4;
}

/* 停用的表為淡色 */
.overview-form__row--disabled td:not(:nth-child(2)) {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.overview-form-move {
  transition: transform 150ms ease;
}
</style>
