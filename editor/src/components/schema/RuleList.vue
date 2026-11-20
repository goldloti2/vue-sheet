<script lang="ts" setup>
  import type { SchemaValue } from '../../../shared/schema'
  import { mdiDragVertical, mdiPlus } from '@mdi/js'
  import { computed, inject, shallowRef } from 'vue'
  import { useDragSort } from '@/composables/useDragSort'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import { useFilesStore } from '@/stores/files'
  import { literalText, propertyValue, stringValue } from '../../../shared/schema'
  import { propertyBefore, ruleItems, sourceOf } from '../../../shared/schemaForm'
  import RuleDialog from './RuleDialog.vue'

  const form = inject(SCHEMA_FORM_KEY)!
  const files = useFilesStore()

  const rules = computed(() => ruleItems(form.model.value))

  // 開啟中的規則的位置
  const editing = shallowRef<number | null>(null)
  const dialogOpen = computed({
    get: () => editing.value !== null,
    set: open => {
      if (!open) {
        editing.value = null
      }
    },
  })

  // 左邊的文字：來源表與條件的原文
  function labelOf (value: SchemaValue): { table: string, when: string } {
    if (value.kind !== 'object') {
      return { table: '以程式碼寫成', when: '' }
    }
    const table = propertyValue(value, 'table')
    const key = stringValue(table)
    const when = sourceOf(form.text(), propertyValue(value, 'when'))
    return {
      table: key === null ? sourceOf(form.text(), table) ?? '（未指定來源表）' : files.tables[key]?.label ?? key,
      when: when?.replaceAll(/\s+/g, ' ') ?? '（每一列）',
    }
  }

  // 新的規則：來源表為第一張真實表，條件永不成立，沒有填入的值。新增後即開啟
  async function addRule (): Promise<void> {
    const source = files.tableOrder.find(key => files.tables[key] && !files.tables[key].virtual) ?? ''
    const create = rules.value === null
      ? [{ kind: 'setProperty' as const, objectPath: [], name: 'rules', valueText: '[]', after: propertyBefore(form.model.value, 'rules') }]
      : []
    await form.applyOrNotify([...create, { kind: 'insert', arrayPath: ['rules'], index: Number.MAX_SAFE_INTEGER, itemText: `{ table: ${literalText(source)}, when: () => false, values: {} }`, multiline: true }], 'soon')
    editing.value = Math.max((rules.value?.length ?? 1) - 1, 0)
  }

  const sort = useDragSort({
    items: () => rules.value ?? [],
    source: () => form.model.value,
    commit: (from, to) => form.applyOrNotify([{ kind: 'move', arrayPath: ['rules'], from, to }], 'soon'),
  })

  // 規則以原文識別，排序時同一條規則保留同一個元素。原文相同時加上序號
  const ruleKeys = computed(() => {
    const seen = new Map<string, number>()
    return (rules.value ?? []).map(item => {
      const text = sourceOf(form.text(), item) ?? ''
      const count = seen.get(text) ?? 0
      seen.set(text, count + 1)
      return `${text}#${count}`
    })
  })
</script>

<template>
  <div v-if="rules === undefined" class="rule-list__note text-medium-emphasis">以程式碼寫成，請以文字編輯</div>

  <div v-else class="rule-list">
    <p class="text-caption text-medium-emphasis mb-2">
      來源表的每一列，符合幾條規則就產生幾列，不是只取第一條成立的規則。列的 id 為「來源列的 id-規則的序號」。
    </p>

    <p v-if="!rules?.length" class="text-body-2 text-medium-emphasis">沒有規則</p>

    <TransitionGroup name="rule-list" tag="ol" @dragover.prevent @drop="sort.drop">
      <li
        v-for="({ item, index }, position) in sort.entries.value"
        :key="ruleKeys[index]"
        class="rule-list__item"
        :class="{ 'rule-list__item--dragging': sort.dragging.value === index }"
        @click="editing = index"
        @dragover="sort.over($event, position)"
      >
        <v-icon
          class="rule-list__handle"
          draggable="true"
          :icon="mdiDragVertical"
          size="18"
          @click.stop
          @dragend="sort.end"
          @dragstart="sort.start($event, index, ($event.target as HTMLElement).closest('li'))"
        />

        <span class="rule-list__number text-medium-emphasis">{{ index + 1 }}</span>
        <span class="rule-list__table">{{ labelOf(item).table }}</span>
        <span class="rule-list__when text-medium-emphasis">{{ labelOf(item).when }}</span>
      </li>
    </TransitionGroup>

    <v-btn
      class="mt-2"
      :prepend-icon="mdiPlus"
      text="新增規則"
      variant="outlined"
      @click="addRule"
    />

    <RuleDialog v-if="editing !== null" v-model="dialogOpen" :index="editing" />
  </div>
</template>

<style scoped>
.rule-list {
  padding: 8px 16px;
}

.rule-list__note {
  padding: 16px;
}

.rule-list ol {
  padding: 0;
  list-style: none;
}

.rule-list__item {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 40px;
  padding: 0 8px;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  cursor: pointer;
}

.rule-list__item:hover {
  background: rgba(var(--v-theme-on-surface), var(--v-hover-opacity));
}

.rule-list__item--dragging {
  opacity: 0.4;
}

.rule-list__handle {
  cursor: grab;
}

.rule-list__table {
  flex: none;
}

.rule-list__when {
  overflow: hidden;
  font-family: monospace;
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-list-move {
  transition: transform 0.2s;
}
</style>
