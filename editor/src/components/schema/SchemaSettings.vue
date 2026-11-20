<script lang="ts" setup>
  import { computed, inject } from 'vue'
  import { SCHEMA_FORM_KEY } from '@/composables/useSchemaForm'
  import { literalText, propertyValue, stringValue } from '../../../shared/schema'
  import { idPrefix, propertyBefore, sourceOf } from '../../../shared/schemaForm'
  import CodeField from './CodeField.vue'
  import CommitTextField from './CommitTextField.vue'

  const form = inject(SCHEMA_FORM_KEY)!

  const label = computed(() => propertyValue(form.model.value?.schema, 'tableLabel'))
  const prefix = computed(() => idPrefix(form.model.value))

  function setLabel (value: string): void {
    void form.applyOrNotify([{ kind: 'setProperty', objectPath: [], name: 'tableLabel', valueText: literalText(value) }], 'now')
  }

  // 字首留空時省略 newId，主鍵改為必填
  function setPrefix (value: string): void {
    const trimmed = value.trim()
    void form.applyOrNotify(trimmed === ''
      ? [{ kind: 'setProperty', objectPath: [], name: 'newId', valueText: null }]
      : [
        { kind: 'ensureImport', name: 'prefixedId', from: '../types' },
        { kind: 'setProperty', objectPath: [], name: 'newId', valueText: `prefixedId(${literalText(trimmed)})`, after: propertyBefore(form.model.value, 'newId') },
      ], 'now')
  }

  function commitNewId (code: string | null) {
    return form.apply([{ kind: 'setProperty', objectPath: [], name: 'newId', valueText: code, code: true, after: propertyBefore(form.model.value, 'newId') }], 'now')
  }
</script>

<template>
  <div class="schema-settings">
    <span class="text-body-2">表名</span>

    <CommitTextField
      v-if="!label || label.kind === 'string'"
      :model-value="stringValue(label) ?? ''"
      @commit="setLabel"
    />

    <span v-else class="text-medium-emphasis">以程式碼寫成：{{ sourceOf(form.text(), label) }}</span>

    <template v-if="!form.model.value?.virtual">
      <span class="text-body-2">主鍵字首</span>

      <CommitTextField
        v-if="prefix !== null"
        :model-value="prefix"
        placeholder="留空時主鍵為必填"
        @commit="setPrefix"
      />

      <CodeField
        v-else
        :code="sourceOf(form.text(), propertyValue(form.model.value?.schema, 'newId'))"
        :commit="commitNewId"
        :doc="form.types.value?.schemaDocs.newId"
        name="newId"
        :object-path="[]"
        title="主鍵字首"
      />
    </template>
  </div>
</template>

<style scoped>
.schema-settings {
  display: grid;
  grid-template-columns: max-content minmax(0, 240px) max-content minmax(0, 240px);
  gap: 4px 12px;
  align-items: center;
  padding: 8px 16px;
}
</style>
