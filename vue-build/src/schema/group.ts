import { sortByKey } from './sort'

// 分組：純函數，將列分為巢狀分組。分組鍵不使用 schema，由呼叫端提供

export interface GroupLevel<Row> {
  // 排序用的鍵，與 label 分開
  sortKey: (row: Row) => string | number
  // 回傳 null 時，此列於此層不再細分。同一組中這類的列併為一個沒有標題的子組
  label: (row: Row) => string | null
}

// label 為 null 者為沒有標題的子組（見 GroupLevel 的 label）
export type RowGroup<Row>
  = | { label: string | null, rows: Row[] }
    | { label: string, subgroups: RowGroup<Row>[] }

type FlatGroup<Row> = { label: string, rows: Row[] } | { label: null, rows: Row[] }

function buildGroups<Row> (rows: readonly Row[], levels: readonly GroupLevel<Row>[]): RowGroup<Row>[] {
  const [level, ...restLevels] = levels
  if (!level) {
    return []
  }

  const groups: FlatGroup<Row>[] = []
  // 不再往下分的列不論是否相鄰，皆併入同一個子組，位置為第一次出現之處
  let untitled: { label: null, rows: Row[] } | undefined
  for (const row of rows) {
    const label = level.label(row)
    if (label === null) {
      if (!untitled) {
        untitled = { label: null, rows: [] }
        groups.push(untitled)
      }
      untitled.rows.push(row)
      continue
    }

    const lastGroup = groups.at(-1)
    if (lastGroup?.label === label) {
      lastGroup.rows.push(row)
    } else {
      groups.push({ label, rows: [row] })
    }
  }

  if (restLevels.length === 0) {
    return groups
  }

  // 下一層全部為 null 時，仍保留為可收合的一組，底下只有一個沒有標題的子組
  return groups.map(group => group.label === null
    ? group
    : { label: group.label, subgroups: buildGroups(group.rows, restLevels) })
}

// 依多層分組鍵將 rows 分為巢狀分組（由外到內）。原本的排序保留為最內層的次要排序
export function groupRows<Row> (rows: readonly Row[], levels: readonly GroupLevel<Row>[]): RowGroup<Row>[] {
  let sorted = [...rows]
  for (let i = levels.length - 1; i >= 0; i--) {
    sorted = sortByKey(sorted, levels[i].sortKey)
  }
  return buildGroups(sorted, levels)
}

// 將巢狀分組攤平為一維，順序與畫面由上往下的順序相同（供 useListOrder 使用）
export function flattenGroups<Row> (groups: readonly RowGroup<Row>[]): Row[] {
  return groups.flatMap(group => 'rows' in group ? group.rows : flattenGroups(group.subgroups))
}
