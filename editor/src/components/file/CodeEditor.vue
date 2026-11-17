<script lang="ts" setup>
  import type { EditorState } from '@codemirror/state'
  import { EditorView } from '@codemirror/view'
  import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
  import { useTheme } from 'vuetify'
  import { createEditorState, themeExtension, themeSlot } from './codeMirror'

  const props = defineProps<{
    path: string
    text: string
    /** 上次離開這個檔案時的狀態。內容與 text 不同時不使用 */
    initialState: EditorState | null
  }>()

  const emit = defineEmits<{
    change: [path: string, text: string]
    leave: [path: string, state: EditorState]
  }>()

  const host = useTemplateRef('host')
  const theme = useTheme()
  let view: EditorView | null = null

  const dark = () => theme.current.value.dark

  onMounted(() => {
    const reusable = props.initialState?.doc.toString() === props.text
    view = new EditorView({
      parent: host.value!,
      state: reusable ? props.initialState! : createEditorState(props.path, props.text, dark()),
      // 修改的通知不放在 state 中，保留的 state 換到新的元件實例時仍通知目前的實例
      dispatchTransactions: (transactions, target) => {
        target.update(transactions)
        if (transactions.some(transaction => transaction.docChanged)) {
          emit('change', props.path, target.state.doc.toString())
        }
      },
    })
    if (reusable) {
      view.dispatch({ effects: themeSlot.reconfigure(themeExtension(dark())) })
    }
  })

  // 放棄修改或重新讀取時，以新的內容取代
  watch(() => props.text, text => {
    if (view && view.state.doc.toString() !== text) {
      view.setState(createEditorState(props.path, text, dark()))
    }
  })

  watch(dark, value => {
    view?.dispatch({ effects: themeSlot.reconfigure(themeExtension(value)) })
  })

  onBeforeUnmount(() => {
    if (view) {
      emit('leave', props.path, view.state)
      view.destroy()
    }
  })
</script>

<template>
  <div ref="host" class="code-editor" />
</template>

<style scoped>
.code-editor {
  height: 100%;
  overflow: hidden;
}

.code-editor :deep(.cm-editor) {
  height: 100%;
}
</style>
