<script lang="ts" setup>
  import type { SchemaEdit, SchemaValue } from '../../../shared/schema'
  import type { PreviewTiming } from '@/composables/useSchemaForm'
  import { mdiDelete, mdiPlus } from '@mdi/js'
  import { computed, inject, shallowRef } from 'vue'
  import { useColorValue } from '@/composables/useColorValue'
  import { useDragSort } from '@/composables/useDragSort'
  import { useMdiIcons } from '@/composables/useMdiIcons'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import { propertyValue, stringValue } from '../../../shared/schema'
  import { columnOptions, columnRows, propertyBefore, sourceOf } from '../../../shared/schemaForm'
  import IconField from './IconField.vue'
  import SettingInput from './SettingInput.vue'

  const form = inject(SCHEMA_FORM_KEY)!
  const colorOf = useColorValue(() => form.types.value)
  const icons = useMdiIcons()

  const options = computed(() => form.types.value?.formatRule ?? [])
  const columns = computed(() => columnOptions(columnRows(form.model.value)))
  const rules = computed(() => {
    const value = propertyValue(form.model.value?.schema, 'formatRules')
    return value?.kind === 'array' ? value.items : (value ? undefined : null)
  })

  const selected = shallowRef(0)
  const rule = computed(() => rules.value?.[Math.min(selected.value, (rules.value?.length ?? 1) - 1)] ?? null)
  const ruleIndex = computed(() => rule.value ? rules.value!.indexOf(rule.value) : -1)

  // 各設定的名稱。不在此表中的設定以說明的第一句為名，沒有說明時為設定名
  const OPTION_TITLES: Record<string, string> = {
    when: '條件',
    columns: '套用欄位',
    color: '顏色',
    bold: '粗體',
    italic: '斜體',
    underline: '底線',
    strike: '刪除線',
    icon: '圖示',
    iconColor: '圖示顏色',
  }

  function titleOf (doc: string | null, name: string): string {
    return OPTION_TITLES[name] ?? (doc?.split(/[，。（]/, 1)[0] || name)
  }

  // 左邊的項目：圖示、第一個套用的欄位，以規則的顏色顯示
  function labelOf (value: SchemaValue) {
    if (value.kind !== 'object') {
      return { text: '以程式碼寫成', color: undefined, icon: null, iconColor: undefined }
    }
    const applied = propertyValue(value, 'columns')
    const first = applied?.kind === 'array' ? stringValue(applied.items[0]) : null
    const color = stringValue(propertyValue(value, 'color'))
    const iconName = sourceOf(form.text(), propertyValue(value, 'icon'))
    return {
      text: first === null ? '（未套用欄位）' : columns.value.find(column => column.value === first)?.title ?? first,
      color: colorOf(color),
      icon: iconName && /^mdi\w+$/.test(iconName) ? icons.value?.[iconName] ?? null : null,
      iconColor: colorOf(stringValue(propertyValue(value, 'iconColor')) ?? color),
    }
  }

  function apply (edits: SchemaEdit[], timing: PreviewTiming = 'soon'): Promise<void> {
    return form.applyOrNotify(edits, timing)
  }

  // 新的規則只含必填的設定：條件永不成立，沒有套用的欄位。新增後選取此規則
  async function addRule (): Promise<void> {
    const create: SchemaEdit[] = rules.value === null
      ? [{ kind: 'setProperty', objectPath: [], name: 'formatRules', valueText: '[]', after: propertyBefore(form.model.value, 'formatRules') }]
      : []
    await apply([...create, { kind: 'insert', arrayPath: ['formatRules'], index: Number.MAX_SAFE_INTEGER, itemText: '{ when: () => false, columns: [] }', multiline: true }])
    selected.value = Math.max((rules.value?.length ?? 1) - 1, 0)
  }

  // 圖示寫成 @mdi/js 的變數，並補上匯入
  function selectIcon (name: string | null): void {
    const path = ['formatRules', ruleIndex.value]
    void apply(name === null
      ? [{ kind: 'setProperty', objectPath: path, name: 'icon', valueText: null }]
      : [{ kind: 'ensureImport', name, from: '@mdi/js' }, { kind: 'setProperty', objectPath: path, name: 'icon', valueText: name }], 'now')
  }

  function removeRule (): void {
    void apply([{ kind: 'remove', arrayPath: ['formatRules'], index: ruleIndex.value }])
  }

  // 移動後仍選取同一條規則
  const sort = useDragSort({
    items: () => rules.value ?? [],
    source: () => form.model.value,
    commit: async (from, to) => {
      const wasSelected = ruleIndex.value === from
      await form.applyOrNotify([{ kind: 'move', arrayPath: ['formatRules'], from, to }], 'soon')
      if (wasSelected) {
        selected.value = to
      }
    },
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
  <div v-if="rules === undefined" class="format-rule-list__note text-medium-emphasis">以程式碼寫成，請以文字編輯</div>

  <div v-else class="format-rule-list">
    <div class="format-rule-list__rules">
      <TransitionGroup name="format-rule-list" tag="ol" @dragover.prevent @drop="sort.drop">
        <li
          v-for="({ item, index }, position) in sort.entries.value"
          :key="ruleKeys[index]"
          class="format-rule-list__item"
          :class="{
            'format-rule-list__item--active': index === ruleIndex,
            'format-rule-list__item--dragging': sort.dragging.value === index,
          }"
          draggable="true"
          @click="selected = index"
          @dragend="sort.end"
          @dragover="sort.over($event, position)"
          @dragstart="sort.start($event, index)"
        >
          <v-icon
            v-if="labelOf(item).icon"
            :icon="labelOf(item).icon!"
            size="18"
            :style="{ color: labelOf(item).iconColor }"
          />

          <span class="format-rule-list__text" :style="{ color: labelOf(item).color }">{{ labelOf(item).text }}</span>
        </li>
      </TransitionGroup>

      <v-btn
        class="format-rule-list__add ma-2"
        :prepend-icon="mdiPlus"
        text="新增規則"
        variant="outlined"
        @click="addRule"
      />
    </div>

    <div class="format-rule-list__detail">
      <div v-if="!rule" class="format-rule-list__note text-medium-emphasis">沒有條件式格式</div>
      <div v-else-if="rule.kind !== 'object'" class="format-rule-list__note text-medium-emphasis">以程式碼寫成，請以文字編輯</div>

      <template v-else>
        <div v-for="option in options" :key="option.name" class="format-rule-list__option">
          <span
            class="text-body-2"
            :class="{ 'format-rule-list__title--top': option.control.kind === 'columns' }"
            :title="option.doc ?? undefined"
          >
            {{ titleOf(option.doc, option.name) }}<span v-if="!option.optional" class="text-error">*</span>
          </span>

          <div class="format-rule-list__input">
            <IconField
              v-if="option.name === 'icon'"
              :code="sourceOf(form.text(), propertyValue(rule, option.name))"
              @select="selectIcon"
            />

            <SettingInput
              v-else
              :columns="columns"
              :object-path="['formatRules', ruleIndex]"
              :option="option"
              :value="propertyValue(rule, option.name)"
              @change="(valueText, timing) => apply([{ kind: 'setProperty', objectPath: ['formatRules', ruleIndex], name: option.name, valueText }], timing)"
            />
          </div>
        </div>
      </template>

      <v-btn
        v-if="rule"
        class="mt-2"
        color="error"
        :prepend-icon="mdiDelete"
        text="刪除規則"
        variant="outlined"
        @click="removeRule"
      />
    </div>
  </div>
</template>

<style scoped>
/* 左邊選擇規則，右邊編輯所選的規則 */
.format-rule-list {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  min-height: 100%;
}

.format-rule-list__rules {
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.format-rule-list__rules ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

.format-rule-list__item {
  display: flex;
  gap: 6px;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  cursor: pointer;
}

.format-rule-list__item--active {
  background: rgba(var(--v-theme-primary), var(--v-activated-opacity));
}

.format-rule-list__item--dragging {
  opacity: 0.4;
}

.format-rule-list-move {
  transition: transform 150ms ease;
}

.format-rule-list__text {
  min-width: 0;
  overflow: hidden;
  font-size: 0.8125rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 字體與規則的項目相同 */
.format-rule-list__add {
  font-size: 0.8125rem;
  font-weight: 400;
  letter-spacing: normal;
}

.format-rule-list__detail {
  max-width: 560px;
  padding: 8px 16px;
}

/* 各設定由上往下，一列一項 */
.format-rule-list__option {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-height: 40px;
}

/* 多列的設定，名稱對齊第一列 */
.format-rule-list__title--top {
  align-self: start;
  padding-top: 6px;
}

.format-rule-list__input {
  display: flex;
  align-items: center;
}

.format-rule-list__input > :deep(.v-selection-control) {
  flex: none;
  margin-left: -8px;
}

.format-rule-list__note {
  padding: 8px 16px;
}
</style>
