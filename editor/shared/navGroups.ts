import { targetPaths } from './editorPages.ts'
import { MOCK_TABLES_FILE } from './tableFiles.ts'
import { ACTIONS_DIR, actionsTableKeyOf, REGISTRY_FILE, tableKeyOf, TABLES_DIR } from './tableKeys.ts'

// 左側的導覽：依類型把專案的檔案分組。每一組為最上層的節點，子項為該組的檔案、頁面與資料夾

export interface NavNode {
  label: string
  /** 名稱旁的淡色小字，例如表的代號 */
  detail?: string
  /** 檔案的路徑。頁面、資料夾與有子項的組為 undefined */
  path?: string
  /** 頁面的識別值（見 editorPages.ts）。檔案、資料夾與有子項的組為 undefined */
  page?: string
  children?: NavNode[]
}

/** 點選節點時開啟的對象：檔案的路徑或頁面的識別值。資料夾與有子項的組為 null */
export function nodeTarget (node: NavNode): string | null {
  return node.path ?? node.page ?? null
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

// 表依 schemas 中的順序，未登記的表排在最後，依代號排序
function byTableOrder (tableOrder: readonly string[]) {
  const rank = (key: string) => {
    const index = tableOrder.indexOf(key)
    return index === -1 ? tableOrder.length : index
  }
  return (a: string, b: string) => rank(a) - rank(b) || a.localeCompare(b)
}

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

// 依序為固定名稱的頁面、各表的資料夾（依表的順序）、其他檔案與資料夾
function pageNodes (files: string[], tableKeys: ReadonlySet<string>, tableLabels: Readonly<Record<string, string>>, tableOrder: readonly string[]): NavNode[] {
  const tableName = (key: string) => tableKeys.has(key) ? tableLabels[key] ?? key : null
  const named = NAMED_PAGES.filter(([filePath]) => files.includes(filePath)).map(([filePath, label]) => fileNode(filePath, label))
  const tree = buildTree(files, PAGES).filter(node => !NAMED_PAGES.some(([filePath]) => filePath === node.path))
  const isTableFolder = (node: NavNode) => node.children !== undefined && tableKeys.has(node.label)
  const order = byTableOrder(tableOrder)
  const tableFolders = tree.filter(node => isTableFolder(node)).toSorted((a, b) => order(a.label, b.label))
  const others = tree.filter(node => !isTableFolder(node))
  return [...named, ...tableFolders, ...others].map(node => {
    if (!node.children) {
      return node
    }
    const children = pageFolderChildren(node.children, tableName)
    return isTableFolder(node) ? tableNode(node.label, tableLabels, { children }) : { label: node.label, children }
  })
}

// 登記於 mock CSV 的檔案以表命名，依表的順序。其他檔案以檔名命名，排在最後
function csvNodes (files: string[], tableLabels: Readonly<Record<string, string>>, order: (a: string, b: string) => number, mockCsv: Readonly<Record<string, string>>): NavNode[] {
  const tableOf = new Map(Object.entries(mockCsv).map(([key, file]) => [file, key]))
  const registered = files.filter(file => tableOf.has(file)).toSorted((a, b) => order(tableOf.get(a)!, tableOf.get(b)!))
  return [
    ...registered.map(file => tableNode(tableOf.get(file)!, tableLabels, { path: file })),
    ...files.filter(file => !tableOf.has(file)).map(file => fileNode(file)),
  ]
}

// 節點之下所有檔案的路徑。頁面為頁面的檔案
export function nodeFiles (node: NavNode): string[] {
  const target = nodeTarget(node)
  return target === null ? (node.children ?? []).flatMap(child => nodeFiles(child)) : targetPaths(target)
}

// 節點之下所有的對象
export function nodeTargets (node: NavNode): string[] {
  const target = nodeTarget(node)
  return target === null ? (node.children ?? []).flatMap(child => nodeTargets(child)) : [target]
}

// 組只有一個子項，且子項為檔案或頁面時，回傳該對象
export function singleTarget (group: NavNode): string | null {
  const [only, ...rest] = group.children ?? []
  return rest.length === 0 && only !== undefined ? nodeTarget(only) : null
}

/** 對象於導覽中的位置，例如 頁面/訂單/列表頁。不在導覽中時為 null */
export function navLocation (nodes: readonly NavNode[], target: string): string | null {
  for (const node of nodes) {
    if (nodeTarget(node) === target) {
      return node.label
    }
    const inner = node.children ? navLocation(node.children, target) : null
    if (inner !== null) {
      return `${node.label}/${inner}`
    }
  }
  return null
}

/** 通往對象的各層資料夾的識別值，由外而內。識別值為上一層的識別值加上 / 與名稱，最上層為組名。不在組中時為 null */
export function navFolderValues (group: NavNode, target: string): string[] | null {
  const search = (node: NavNode, value: string): string[] | null => {
    for (const child of node.children ?? []) {
      if (nodeTarget(child) === target) {
        return []
      }
      const childValue = `${value}/${child.label}`
      const inner = child.children ? search(child, childValue) : null
      if (inner !== null) {
        return [childValue, ...inner]
      }
    }
    return null
  }
  return search(group, group.label)
}

export interface NavContext {
  /** 表的代號對應 tableLabel */
  tableLabels?: Readonly<Record<string, string>>
  /** schemas 中的順序 */
  tableOrder?: readonly string[]
  /** 表的代號對應登記的 mock CSV 的路徑 */
  mockCsv?: Readonly<Record<string, string>>
}

// 沒有檔案的組不列出。表、動作、頁面中各表的資料夾與測試資料依 tableOrder（schemas 中的順序）排列
export function navGroups (files: readonly string[], { tableLabels = {}, tableOrder = [], mockCsv = {} }: NavContext = {}): NavNode[] {
  const single = (label: string, filePath: string): NavNode[] => files.includes(filePath) ? [{ label, children: [fileNode(filePath)] }] : []
  const group = (label: string, children: NavNode[]): NavNode[] => children.length > 0 ? [{ label, children }] : []

  const pick = (test: (file: string) => boolean) => files.filter(file => test(file)).toSorted(byPath)
  const tableKeys = new Set(files.map(file => tableKeyOf(file)).filter(key => key !== null))

  const order = byTableOrder(tableOrder)
  const tables = pick(file => file.startsWith(TABLES_DIR))
    .map(file => tableNode(tableKeyOf(file) ?? baseName(file), tableLabels, { path: file }))
    .toSorted((a, b) => order(a.detail ?? a.label, b.detail ?? b.label))
  const registry = pick(file => file === REGISTRY_FILE).map(file => fileNode(file, '總覽'))
  const actions = pick(file => file.startsWith(ACTIONS_DIR))
    .map(file => tableNode(actionsTableKeyOf(file) ?? baseName(file), tableLabels, { path: file }))
    .toSorted((a, b) => order(a.detail ?? a.label, b.detail ?? b.label))
  const pages = pageNodes(pick(file => file.startsWith(PAGES)), tableKeys, tableLabels, tableOrder)

  return [
    ...group('表', [...registry, ...tables]),
    ...group('動作', actions),
    ...group('頁面', pages),
    ...single('導覽', `${SRC}config/navigation.ts`),
    ...single('後端', 'apps-script/Config.gs'),
    ...group('測試資料', [
      ...pick(file => file === MOCK_TABLES_FILE).map(file => fileNode(file, '總覽')),
      ...csvNodes(pick(file => file.startsWith('vue-build/mock/')), tableLabels, order, mockCsv),
    ]),
  ]
}
