# ExpandAllRow

分組的列表最上方的全展開列，外觀與 [GroupedList](GroupedList.md) 可展開的分組列相同。文字為「全部」，後面以 [CountLabel](CountLabel.md) 標示全部的列數。展開時於下方平鋪全部的列，收合時分組。

**一般無須直接使用此元件**，由 [ListPage](../page/ListPage.md) 放置。

## Props

| prop | 型別 | 說明 |
| --- | --- | --- |
| `v-model` | `boolean` | **必填**，是否平鋪 |
| `count` | `number` | **必填**，全部的列數 |

## Slots

| slot | 說明 |
| --- | --- |
| `default` | 平鋪的列，只在展開時渲染 |

## 備註

- 展開與收合的動畫與 GroupedList 的組相同。`ListPage` 於展開時同時收合各組

- 樣式與 GroupedList 共用，定義於 `src/styles/list.css` 的 `.grouped-list`
