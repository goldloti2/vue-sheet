import type { ChartData } from '@/schema/chart'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineChart, highlightOf, pickElement, shownDatasets, toggleLegend, togglePicked } from '@/schema/chart'
import { sampleSchema } from '../fixtures/schema'

const r1 = { id: '1', status: '高', price: 10, level: 1, done: true, day: new Date(2026, 0, 15), tag: 'A' }
const r2 = { id: '2', status: '低', price: 30, level: 2, done: false, day: new Date(2026, 2, 2), tag: 'B' }
const r3 = { id: '3', status: '高', price: 20, level: null, done: true, day: new Date(2026, 0, 31), tag: 'x' }
const r4 = { id: '4', status: null, price: null, level: null, done: null, day: null, tag: 'x' }
const r5 = { id: '5', status: '其他', price: 40, level: null, done: false, day: new Date(2026, 2, 10), tag: 'y' }
const rows = [r1, r2, r3, r4, r5]

type Category = Extract<ChartData<typeof r1>, { kind: 'category' }>

function category (data: ChartData<typeof r1>): Category {
  if (data.kind !== 'category') {
    throw new Error('不是分組類的圖表')
  }
  return data
}

describe('分組', () => {
  it('select 依 options 的順序，沒有列的選項也列出，其他的值接在後面，空值為最後的「(空白)」', () => {
    const data = category(defineChart(sampleSchema, { type: 'bar', group: { key: 'status' }, values: [{ stat: 'count' }] }).compute(rows))
    expect(data.labels).toEqual(['高', '中', '低', '其他', '(空白)'])
    expect(data.datasets[0]).toMatchObject({ label: '數量', unit: 'number', data: [2, 0, 1, 1, 1] })
    expect(data.groups[0].filter).toEqual({ key: 'status', condition: { values: ['高'] } })
    expect(data.groups[4]).toMatchObject({ colorKey: 'chartBlank', filter: { key: 'status', condition: { values: [null] } }, rows: [r4] })
  })

  it('excludeBlank 時不列出空值', () => {
    const data = category(defineChart(sampleSchema, { type: 'bar', group: { key: 'status', excludeBlank: true }, values: [{ stat: 'count' }] }).compute(rows))
    expect(data.labels).not.toContain('(空白)')
  })

  it('依數值排序，前 N 組以外合併為「其他」。數值相同時依分組本身，降序時反轉', () => {
    const data = category(defineChart(sampleSchema, {
      type: 'bar',
      group: { key: 'tag', order: { by: 'value', direction: 'desc' }, limit: 2 },
      values: [{ stat: 'count' }],
    }).compute(rows))
    expect(data.labels).toEqual(['x', 'y', '其他'])
    expect(data.datasets[0].data).toEqual([2, 1, 2])
    expect(data.groups[2]).toMatchObject({ colorKey: 'chartOthers', filter: { key: 'tag', condition: { values: ['B', 'A'] } }, rows: [r2, r1] })
  })

  it('date 依月分組，從最早到最晚的月份皆列出', () => {
    const data = category(defineChart(sampleSchema, { type: 'bar', group: { key: 'day', unit: 'month' }, values: [{ stat: 'count' }] }).compute(rows))
    expect(data.labels).toEqual(['2026/01', '2026/02', '2026/03', '(空白)'])
    expect(data.datasets[0].data).toEqual([2, 0, 2, 1])
    expect(data.groups[0].filter).toEqual({ key: 'day', condition: { segment: { min: new Date(2026, 0, 1), below: new Date(2026, 1, 1) } } })
  })

  it('number 在最小值與最大值之間等分，最後一段包含最大值', () => {
    const data = category(defineChart(sampleSchema, { type: 'bar', group: { key: 'price', bins: 3 }, values: [{ stat: 'count' }] }).compute(rows))
    expect(data.labels).toEqual(['10 ～ 20', '20 ～ 30', '30 ～ 40', '(空白)'])
    expect(data.datasets[0].data).toEqual([1, 1, 2, 1])
    expect(data.groups[0].filter?.condition).toEqual({ segment: { min: 10, below: 20 } })
    expect(data.groups[2].filter?.condition).toEqual({ segment: { min: 30 } })
  })

  it('沒有 group 的文字統計，全部的列為一組', () => {
    const data = category(defineChart(sampleSchema, { type: 'stat', values: [{ stat: 'count' }] }).compute(rows))
    expect(data.labels).toEqual([''])
    expect(data.datasets[0].data).toEqual([5])
  })
})

describe('統計', () => {
  it('sum 沒有值時為 0，avg、min、max 沒有值時為 null', () => {
    const data = category(defineChart(sampleSchema, {
      type: 'bar',
      group: { key: 'done' },
      values: [{ stat: 'sum', key: 'price' }, { stat: 'avg', key: 'price' }, { stat: 'min', key: 'price' }, { stat: 'max', key: 'price' }],
    }).compute(rows))
    expect(data.labels).toEqual(['否', '是', '(空白)'])
    expect(data.datasets.map(dataset => dataset.label)).toEqual(['價格的總和', '價格的平均', '價格的最小', '價格的最大'])
    expect(data.datasets.map(dataset => dataset.data)).toEqual([[70, 30, 0], [35, 15, null], [30, 10, null], [40, 20, null]])
  })

  it('count 的百分比為佔全部的比例', () => {
    const data = category(defineChart(sampleSchema, { type: 'bar', group: { key: 'status' }, values: [{ stat: 'count', percent: true }] }).compute(rows))
    expect(data.datasets[0]).toMatchObject({ unit: 'percent', data: [40, 0, 20, 20, 20] })
  })

  it('boolean 的百分比為組內為「是」的比例，沒有列的組為 null', () => {
    const data = category(defineChart(sampleSchema, { type: 'bar', group: { key: 'status' }, values: [{ stat: 'sum', key: 'done', percent: true }] }).compute(rows))
    expect(data.datasets[0]).toMatchObject({ label: '完成為「是」的比例', data: [100, null, 0, 0, 0] })
  })

  it('自訂的統計可讀取各組的列與此組的位置', () => {
    const data = category(defineChart(sampleSchema, {
      type: 'bar',
      group: { key: 'status', excludeBlank: true },
      values: [{ stat: (list, { index, groups }) => index === 0 ? null : list.length - groups[index - 1].length, label: '差' }],
    }).compute(rows))
    expect(data.datasets[0]).toMatchObject({ label: '差', data: [null, -2, 1, 0] })
  })
})

describe('系列', () => {
  const chart = (percent: boolean) => category(defineChart(sampleSchema, {
    type: 'bar',
    group: { key: 'status', excludeBlank: true },
    series: { key: 'done', excludeBlank: true },
    values: [{ stat: 'count', percent }],
    stacked: true,
  }).compute(rows))

  it('每個系列一個 dataset', () => {
    const data = chart(false)
    expect(data.datasets.map(dataset => [dataset.label, dataset.series, dataset.data])).toEqual([
      ['否', 0, [0, 0, 1, 1]],
      ['是', 1, [2, 0, 0, 0]],
    ])
  })

  it('堆疊的百分比為佔同一組的比例', () => {
    expect(chart(true).datasets.map(dataset => dataset.data)).toEqual([[0, null, 100, 100], [100, null, 0, 0]])
  })
})

describe('座標類', () => {
  it('每一列為一個點，座標為空的列略過', () => {
    const data = defineChart(sampleSchema, { type: 'scatter', x: 'price', y: 'level' }).compute(rows)
    expect(data).toMatchObject({
      kind: 'point',
      xUnit: 'number',
      datasets: [{ label: '測試', data: [{ x: 10, y: 1, row: r1 }, { x: 30, y: 2, row: r2 }] }],
    })
  })
})

describe('defineChart', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('分組欄與系列欄列入 filterKeys', () => {
    const chart = defineChart(sampleSchema, { type: 'bar', group: { key: 'status' }, series: { key: 'done' }, values: [{ stat: 'count' }] })
    expect(chart.filterKeys).toEqual(['status', 'done'])
  })

  it('開發模式下警告 date 沒有 unit，以及不在 searchable 中的分組欄', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    defineChart(sampleSchema, { type: 'bar', group: { key: 'day' }, values: [{ stat: 'count' }] })
    defineChart(sampleSchema, { type: 'bar', group: { key: 'level' }, values: [{ stat: 'count' }] })
    expect(warn).toHaveBeenCalledTimes(2)
  })
})

describe('高光與點擊', () => {
  const data = category(defineChart(sampleSchema, { type: 'bar', group: { key: 'status' }, values: [{ stat: 'count' }] }).compute(rows))

  it('有條件時標出符合的組，沒有列的組不算符合', () => {
    expect(highlightOf(data.groups, 'status', { status: { values: ['高'] } })).toEqual([true, false, false, false, false])
    expect(highlightOf(data.groups, 'status', {})).toBeNull()
  })

  it('點擊圖例切換一個值，可複選，再點即取消', () => {
    const pickA = { key: 'tag', condition: { values: ['A'] } }
    const once = toggleLegend({}, pickA)
    expect(once).toEqual({ tag: { values: ['A'] } })
    expect(toggleLegend(once, { key: 'tag', condition: { values: ['B'] } })).toEqual({ tag: { values: ['A', 'B'] } })
    expect(toggleLegend(once, pickA)).toEqual({})
  })

  it('區間只能選一段，再點同一段即移除', () => {
    const pick = { key: 'price', condition: { segment: { min: 10, below: 20 } } }
    expect(toggleLegend(toggleLegend({}, pick), pick)).toEqual({})
  })

  it('點擊圖表只選這一組與其系列，再點同一處即移除', () => {
    const picks = [{ key: 'status', condition: { values: ['高'] } }, { key: 'done', condition: { values: ['true'] } }]
    const picked = pickElement({ status: { values: ['低', '中'] } }, picks)
    expect(picked).toEqual({ status: { values: ['高'] }, done: { values: ['true'] } })
    expect(pickElement(picked, picks)).toEqual({})
  })
})

describe('togglePicked', () => {
  it('點擊時勾選，可複選，再點擊時取消', () => {
    const one = togglePicked(new Set(), 1)
    const two = togglePicked(one, 0)
    expect([...two]).toEqual([1, 0])
    expect([...togglePicked(two, 1)]).toEqual([0])
  })

  it('不修改傳入的集合', () => {
    const picked = new Set([1])
    togglePicked(picked, 0)
    expect([...picked]).toEqual([1])
  })
})

describe('shownDatasets', () => {
  it('沒有勾選時為 null，全部顯示', () => {
    expect(shownDatasets([{}, {}], new Set())).toBeNull()
  })

  it('有勾選時只顯示勾選的', () => {
    expect(shownDatasets([{}, {}, {}], new Set([0, 2]))).toEqual([true, false, true])
  })

  it('有系列的 dataset 不受影響', () => {
    expect(shownDatasets([{ series: 0 }, {}], new Set([1]))).toEqual([true, true])
  })
})
