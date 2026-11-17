import { ACTIONS_DIR, actionsTableKeyOf, tableKeyOf, TABLES_DIR } from './tableKeys'

// 左側的導覽：依類型把專案的檔案分組。每一組為最上層的節點

export interface NavNode {
  label: string
  /** 名稱旁的淡色小字，例如表的代號 */
  detail?: string
  /** 檔案的路徑。資料夾與有子項的組為 undefined */
  path?: string
  children?: NavNode[]
}

const SRC = 'vue-build/src/'
const PAGES = `${SRC}pages/`

function baseName (filePath: string): string {
  return filePath.slice(filePath.lastIndexOf('/') + 1)
}

// 名稱去掉 .vue 與 .ts。其他副檔名保留
function fileNode (filePath: string, label = baseName(filePath).replace(/\.(?:vue|ts)$/, '')): NavNode {
  return { label, path: filePath }
}

// 有 tableLabel 的表以 tableLabel 為名稱，代號列於旁邊。沒有時以代號為名稱
function tableNode (key: string, tableLabels: Readonly<Record<string, string>>, node: Omit<NavNode, 'label'>): NavNode {
  const label = tableLabels[key]
  return label === undefined ? { label: key, ...node } : { label, detail: key, ...node }
}

const byPath = (a: string, b: string) => a.localeCompare(b)

// 名稱以 _ 開頭的資料夾（_ref）排在最後
function folderOrder (a: string, b: string): number {
  return Number(a.startsWith('_')) - Number(b.startsWith('_')) || a.localeCompare(b)
}

// 每一層先列檔案，再列資料夾，各自依檔名排序
function buildTree (files: string[], prefix: string): NavNode[] {
  const leaves: string[] = []
  const folders = new Map<string, string[]>()
  for (const file of files) {
    const rest = file.slice(prefix.length)
    const slash = rest.indexOf('/')
    if (slash === -1) {
      leaves.push(file)
    } else {
      const folder = rest.slice(0, slash)
      folders.set(folder, [...folders.get(folder) ?? [], file])
    }
  }

  return [
    ...leaves.toSorted(byPath).map(file => fileNode(file)),
    ...[...folders.keys()].toSorted(folderOrder).map(folder => ({
      label: folder,
      children: buildTree(folders.get(folder)!, `${prefix}${folder}/`),
    })),
  ]
}

// 頁面的資料夾以固定名稱顯示，[id] 中的檔案與列表頁列於同一層
// 依序為列表頁、詳細頁、展開頁、其他檔案、其他資料夾、引用畫面。同一類依檔名排序
function pageFolderChildren (children: NavNode[], tableName: (key: string) => string | null): NavNode[] {
  const list: NavNode[] = []
  const detail: NavNode[] = []
  const expanded: NavNode[] = []
  const files: NavNode[] = []
  const folders: NavNode[] = []
  const refs: NavNode[] = []

  const addPage = (page: NavNode) => {
    if (!page.path) {
      folders.push(page)
      return
    }
    const childTable = tableName(page.label)
    if (childTable === null) {
      files.push(page)
    } else {
      expanded.push({ ...page, label: `展開頁：${childTable}` })
    }
  }

  for (const child of children) {
    if (child.path && child.label === 'index') {
      list.push({ ...child, label: '列表頁' })
    } else if (child.children && child.label === '[id]') {
      for (const page of child.children) {
        if (page.path && page.label === 'index') {
          detail.push({ ...page, label: '詳細頁' })
        } else {
          addPage(page)
        }
      }
    } else if (child.children && child.label === '_ref') {
      refs.push({ ...child, label: '引用畫面' })
    } else if (child.path) {
      files.push(child)
    } else {
      folders.push(child)
    }
  }

  const byFile = (a: NavNode, b: NavNode) => byPath(a.path ?? a.label, b.path ?? b.label)
  return [...list, ...detail, ...expanded.toSorted(byFile), ...files.toSorted(byFile), ...folders, ...refs]
}

// 以固定名稱顯示的頁面，依此順序列於最上方
const NAMED_PAGES: readonly (readonly [string, string])[] = [
  [`${PAGES}login.vue`, '登入頁'],
  [`${PAGES}index.vue`, '首頁'],
]

function pageNodes (files: string[], tableKeys: ReadonlySet<string>, tableLabels: Readonly<Record<string, string>>): NavNode[] {
  const tableName = (key: string) => tableKeys.has(key) ? tableLabels[key] ?? key : null
  const named = NAMED_PAGES.filter(([filePath]) => files.includes(filePath)).map(([filePath, label]) => fileNode(filePath, label))
  const others = buildTree(files, PAGES).filter(node => !NAMED_PAGES.some(([filePath]) => filePath === node.path)).map(node => {
    if (!node.children) {
      return node
    }
    const children = pageFolderChildren(node.children, tableName)
    return tableKeys.has(node.label) ? tableNode(node.label, tableLabels, { children }) : { label: node.label, children }
  })
  return [...named, ...others]
}

// 沒有檔案的組不列出。只對應一個檔案的組本身即為該檔案
export function navGroups (files: readonly string[], tableLabels: Readonly<Record<string, string>> = {}): NavNode[] {
  const single = (label: string, filePath: string): NavNode[] => files.includes(filePath) ? [{ label, path: filePath }] : []
  const group = (label: string, children: NavNode[]): NavNode[] => children.length > 0 ? [{ label, children }] : []

  const pick = (test: (file: string) => boolean) => files.filter(file => test(file)).toSorted(byPath)
  const tableKeys = new Set(files.map(file => tableKeyOf(file)).filter(key => key !== null))

  const tables = pick(file => file.startsWith(TABLES_DIR))
    .map(file => tableNode(tableKeyOf(file) ?? baseName(file), tableLabels, { path: file }))
  const registry = pick(file => file === `${SRC}schema/index.ts`).map(file => fileNode(file, '總覽'))
  const actions = pick(file => file.startsWith(ACTIONS_DIR))
    .map(file => tableNode(actionsTableKeyOf(file) ?? baseName(file), tableLabels, { path: file }))
  const pages = pageNodes(pick(file => file.startsWith(PAGES)), tableKeys, tableLabels)

  return [
    ...group('表', [...registry, ...tables]),
    ...group('動作', actions),
    ...group('頁面', pages),
    ...single('導覽', `${SRC}config/navigation.ts`),
    ...single('後端', 'apps-script/Config.gs'),
    ...group('資料', [
      ...pick(file => file === `${SRC}services/mock/tables.ts`).map(file => fileNode(file)),
      ...pick(file => file.startsWith('vue-build/mock/')).map(file => fileNode(file)),
    ]),
  ]
}
