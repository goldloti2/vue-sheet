import { sortByKey } from './sort'

// 分組：純函數，把一批 row 分成巢狀分組。分組鍵不吃 schema，由呼叫端給

export interface GroupLevel<Row> {
  // 排序用；分開於 label 是為了避免依顯示字串排序出錯（例如「10月」< 「2月」）
  sortKey: (row: Row) => string | number
  label: (row: Row) => string
}

export type RowGroup<Row>
  = | { label: string, rows: Row[] }
    | { label: string, subgroups: RowGroup<Row>[] }

function buildGroups<Row> (rows: readonly Row[], levels: readonly GroupLevel<Row>[]): RowGroup<Row>[] {
  const [level, ...restLevels] = levels
  if (!level) {
    return []
  }

  const groups: { label: string, rows: Row[] }[] = []
  for (const row of rows) {
    const label = level.label(row)
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

  return groups.map(group => ({
    label: group.label,
    subgroups: buildGroups(group.rows, restLevels),
  }))
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
