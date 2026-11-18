import { shallowRef } from 'vue'

// 新增表與刪除表的對話框，由導覽與總覽開啟，置於版面中
const newTableOpen = shallowRef(false)
// 刪除中的表的代號
const deletingTable = shallowRef<string | null>(null)

export function useTableDialogs () {
  return { newTableOpen, deletingTable }
}
