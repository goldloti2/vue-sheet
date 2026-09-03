// 複製到 src/composables/actions/use__Table__Actions.ts
import type { __Table__Row } from '@/schema/__table__'
import type { Ref } from 'vue'
import { computed } from 'vue'
import { useDeleteAction, useEditAction, useNewAction } from '@/composables/actions/useTableActions'

export function use__Table__Actions (row?: Ref<__Table__Row | null>) {
  return {
    new: useNewAction('__table__'),
    edit: row ? useEditAction('__table__', row) : computed(() => []),
    delete: row ? useDeleteAction('__table__', row) : undefined,

  }
}
