import { sortByKey } from './sort'

// 分組：純函數，把一批 row 分成巢狀分組。分組鍵不吃 schema，由呼叫端給

export interface GroupLevel<Row> {
  // 排序用，與 label 分開
  sortKey: (row: Row) => string | number
  // 回傳 null 表示這一列於此層不再往下分：同一組中這類的列併成一個沒有標題的子組
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

// 依多層分組鍵把 rows 分成巢狀分組（由外到內）。levels 依序疊加穩定排序，
// 原本的排序（例如 sortRows 排好的 defaultSort）會保留成最內層的 tiebreaker
export function groupRows<Row> (rows: readonly Row[], levels: readonly GroupLevel<Row>[]): RowGroup<Row>[] {
  let sorted = [...rows]
  for (let i = levels.length - 1; i >= 0; i--) {
    sorted = sortByKey(sorted, levels[i].sortKey)
  }
  return buildGroups(sorted, levels)
}

// 把巢狀分組攤回一維，順序就是畫面上由上往下的順序（給 useListOrder 用）
export function flattenGroups<Row> (groups: readonly RowGroup<Row>[]): Row[] {
  return groups.flatMap(group => 'rows' in group ? group.rows : flattenGroups(group.subgroups))
}
