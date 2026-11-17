<script lang="ts" setup>
  import { provide, shallowRef } from 'vue'
  import { SCHEMA_FORM_KEY, useSchemaForm } from '@/composables/useSchemaForm'
  import ColumnGrid from './ColumnGrid.vue'
  import FormatRuleList from './FormatRuleList.vue'
  import SchemaLists from './SchemaLists.vue'
  import SchemaSettings from './SchemaSettings.vue'

  const props = defineProps<{
    path: string
    text: string
  }>()

  type FormTab = 'columns' | 'lists' | 'formatRules'

  const form = useSchemaForm(() => props.path, () => props.text)
  provide(SCHEMA_FORM_KEY, form)

  const tab = shallowRef<FormTab>('columns')
</script>

<template>
  <div class="schema-form editor-compact-inputs">
    <div v-if="!form.model.value" class="schema-form__message text-medium-emphasis">讀取中</div>

    <div v-else-if="!form.model.value.schema" class="schema-form__message text-medium-emphasis">
      找不到 schema 物件，請以文字編輯
    </div>

    <template v-else>
      <SchemaSettings />

      <v-tabs
        v-model="tab"
        class="schema-form__tabs"
        color="primary"
        density="compact"
      >
        <v-tab text="欄位" value="columns" />
        <v-tab text="搜尋與排序" value="lists" />
        <v-tab text="條件式格式" value="formatRules" />
      </v-tabs>

      <div class="schema-form__body">
        <ColumnGrid v-if="tab === 'columns'" />
        <SchemaLists v-else-if="tab === 'lists'" />
        <FormatRuleList v-else />
      </div>
    </template>
  </div>
</template>

<style scoped>
.schema-form {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.schema-form__tabs {
  flex: none;
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.schema-form__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.schema-form__message {
  padding: 16px;
}
</style>
