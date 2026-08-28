import type { TemplateRow } from '@/schema/template'
import type { Ref } from 'vue'
import { computed } from 'vue'
import { useDeleteAction, useEditAction, useNewAction } from '@/composables/actions/useTableActions'

export function useTemplateActions (row?: Ref<TemplateRow | null>) {
  return {
    new: useNewAction('template'),
    edit: row ? useEditAction('template', row) : computed(() => []),
    delete: row ? useDeleteAction('template', row) : computed(() => []),
  }
}
