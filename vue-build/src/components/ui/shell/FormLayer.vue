<script lang="ts" setup>
  import type { FormView, Layer } from '@/composables/shell/formLayerState'
  import { mdiArrowLeft } from '@mdi/js'
  import PageState from '@/components/ui/page/PageState.vue'
  import DataForm from '@/components/ui/record/DataForm.vue'
  import { formTitle, useCreateForm, useEditForm } from '@/composables/form/useTableForm'
  import { requestCloseLayer } from '@/composables/shell/useFormLayers'
  import { schemas } from '@/schema'

  const { layer, view } = defineProps<{
    layer: Layer
    view: FormView
  }>()

  const schema = schemas[view.table]
  const editing = view.id !== undefined

  const { form, fieldErrors, error, loading, loadError, submitLabel, submit } = view.id === undefined
    ? useCreateForm(view.table, schema, layer, view.defaults)
    : useEditForm(view.table, schema, layer, view.id)

  // 編輯時主鍵唯讀
  const lockId = view.lockId ?? editing

  // 新增父列只支援一層
  const creatable = layer.depth === 1
</script>

<template>
  <v-layout class="form-layer bg-background" full-height>
    <v-app-bar>
      <v-app-bar-nav-icon aria-label="返回" :icon="mdiArrowLeft" @click="requestCloseLayer" />
      <v-app-bar-title>{{ formTitle(schema, editing) }}</v-app-bar-title>
    </v-app-bar>

    <v-main scrollable>
      <PageState :empty="!form" :error="loadError" :loading="loading">
        <!-- PageState 已擋下 null，此層只用於縮小型別 -->
        <template v-if="form">
          <DataForm
            v-model="form"
            :creatable="creatable"
            :errors="fieldErrors"
            :lock-id="lockId"
            :order="view.order"
            :schema="schema"
          />

          <!-- 送出失敗的訊息，表單留在畫面上 -->
          <v-container v-if="error">
            <v-alert :text="error" type="error" />
          </v-container>

          <!-- 這張表額外放置的內容，例如說明、預覽。一般不使用 -->
          <component :is="view.content" v-if="view.content" :row="form" />
        </template>
      </PageState>
    </v-main>

    <v-bottom-navigation class="form-layer__actions" grow>
      <v-btn @click="requestCloseLayer">取消</v-btn>
      <v-btn @click="submit">{{ submitLabel }}</v-btn>
    </v-bottom-navigation>
  </v-layout>
</template>

<style scoped>
/* 文字使用一般按鈕的字級，不使用底部導覽列的字級（見 docs/design/form.md） */
.form-layer__actions :deep(.v-bottom-navigation__content) {
  font-size: 0.875rem;
}
</style>
