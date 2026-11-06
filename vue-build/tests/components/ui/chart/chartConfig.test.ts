import { describe, expect, it } from 'vitest'
import { buildConfig, formatParts, formatValue, paletteColors, withAlpha, wrapText } from '@/components/ui/chart/chartConfig'
import { defineChart } from '@/schema/chart'
import { sampleSchema } from '../../../fixtures/schema'

// 每個字寬 1，空白也算
const measure = (part: string) => part.length

describe('wrapText', () => {
  it('放得下時原樣回傳字串', () => {
    expect(wrapText('abc', 3, measure)).toBe('abc')
  })

  it('寬度不大於 0 時不換行', () => {
    expect(wrapText('abcdef', 0, measure)).toBe('abcdef')
  })

  it('其他文字優先於空白處斷開，行尾不留空白', () => {
    expect(wrapText('ab cd ef', 5, measure)).toEqual(['ab cd', 'ef'])
  })

  it('中日韓文字可於任何字之間斷開', () => {
    expect(wrapText('一二三四五', 2, measure)).toEqual(['一二', '三四', '五'])
  })

  it('單字放不下時逐字斷開', () => {
    expect(wrapText('abcdefg h', 3, measure)).toEqual(['abc', 'def', 'g h'])
  })
})

describe('withAlpha', () => {
  it('#rrggbb 轉為 rgba', () => {
    expect(withAlpha('#36a2eb', 0.5)).toBe('rgba(54, 162, 235, 0.5)')
  })

  it('其他格式原樣回傳', () => {
    expect(withAlpha('red', 0.5)).toBe('red')
    expect(withAlpha('#fff', 0.5)).toBe('#fff')
  })
})

describe('formatParts 與 formatValue', () => {
  it('不是數字時為空字串', () => {
    expect(formatParts(null, 'number')).toEqual({ text: '', suffix: '' })
    expect(formatParts(Number.NaN, 'number')).toEqual({ text: '', suffix: '' })
  })

  it('數字取到小數第二位並加上千分位', () => {
    expect(formatValue(1234.567, 'number')).toBe('1,234.57')
  })

  it('百分比取到小數第一位，單位預設為 %', () => {
    expect(formatParts(12.345, 'percent')).toEqual({ text: '12.3', suffix: '%' })
  })

  it('時長的值為秒，日期的值為毫秒', () => {
    expect(formatValue(3723, 'duration')).toBe('1:02:03')
    expect(formatValue(new Date(2024, 0, 5).getTime(), 'date')).toBe('2024/01/05')
  })

  it('sign 只為正數加上 +，suffix 取代單位', () => {
    expect(formatParts(5, 'number', { sign: true, suffix: '元' })).toEqual({ text: '+5', suffix: '元' })
    expect(formatParts(-5, 'number', { sign: true }).text).toBe('-5')
    expect(formatParts(0, 'number', { sign: true }).text).toBe('0')
  })

  it('日期不套用 sign', () => {
    expect(formatParts(new Date(2024, 0, 5).getTime(), 'date', { sign: true }).text).toBe('2024/01/05')
  })
})

describe('paletteColors', () => {
  it('沒有指定時依色盤的順序輪流', () => {
    expect(paletteColors(['a', 'b', 'c'], {})).toEqual(['#36a2eb', '#ff6384', '#ff9f40'])
  })

  it('指定的使用指定的顏色，其餘從上一個顏色之後輪流，並跳過已指定的顏色', () => {
    expect(paletteColors(['a', 'b', 'c'], { a: 'red', c: 'orange' })).toEqual(['#ff6384', '#ffcd56', '#ff9f40'])
  })

  it('超過色盤的數量時從頭輪流', () => {
    const names = Array.from({ length: 8 }, (_, index) => `n${index}`)
    expect(paletteColors(names, {}).at(-1)).toBe('#36a2eb')
  })
})

describe('buildConfig 的 marks.shown', () => {
  const definition = defineChart(sampleSchema, {
    type: 'bar',
    group: { key: 'status' },
    values: [{ stat: 'count', label: '數量' }, { stat: 'sum', key: 'price', label: '總價', axis: 'right' }],
  })
  const data = definition.compute([{ id: '1', status: '高', price: 10 }])
  const theme = { text: '#000000', grid: '#000000', surface: '#ffffff' }

  function build (shown: boolean[] | null) {
    return buildConfig(definition, data, theme, { groups: null, datasets: null, shown }) as unknown as {
      data: { datasets: { hidden: boolean }[] }
      options: {
        scales: Record<string, { display?: string }>
        plugins: { legend: { labels: { generateLabels: (chart: object) => { fillStyle: string, hidden?: boolean }[] } } }
      }
    }
  }

  it('沒有勾選時全部畫出', () => {
    expect(build(null).data.datasets.map(dataset => dataset.hidden)).toEqual([false, false])
  })

  it('沒勾選的 dataset 不畫出', () => {
    expect(build([true, false]).data.datasets.map(dataset => dataset.hidden)).toEqual([false, true])
  })

  it('沒勾選的圖例調淡，不標示為隱藏', () => {
    const [on, off] = build([true, false]).options.plugins.legend.labels.generateLabels({})
    expect(off?.fillStyle).not.toBe(on?.fillStyle)
    expect(off?.hidden).toBeUndefined()
  })

  it('數值軸於沒有顯示的 dataset 時隱藏', () => {
    const { scales } = build(null).options
    expect(scales.y?.display).toBe('auto')
    expect(scales.right?.display).toBe('auto')
  })
})
