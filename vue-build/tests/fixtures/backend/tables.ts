import childrenCsv from './children.csv?raw'
import notesCsv from './notes.csv?raw'
import parentsCsv from './parents.csv?raw'

// 以 vi.mock 取代 @/services/mock/tables：假後端讀取的 CSV
export const mockCsv: Record<string, string> = {
  parents: parentsCsv,
  children: childrenCsv,
  notes: notesCsv,
}
