// 單張表的讀取與表頭對應。批次的順序、鎖、寫入皆在 Batch.gs

// 指令碼屬性 SPREADSHEET_ID 有值時開啟該試算表，否則使用綁定的試算表
function spreadsheet () {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet()
}

// 整個檔案的修改時間，作為衝突比對的基準
function modifiedTime () {
  return DriveApp.getFileById(spreadsheet().getId()).getLastUpdated().toISOString()
}

function tableConfig (table) {
  const config = TABLES[table]
  if (!config) {
    throw apiError(`unknown table "${table}"`)
  }
  return config
}

// 一張表只讀取一次（表頭與全部資料列），之後尋找列、檢查重複 id、計算列號皆使用這份快取
function readSheet (table) {
  const config = tableConfig(table)
  const sheet = spreadsheet().getSheetByName(config.sheetName)
  if (!sheet) {
    throw apiError(`sheet "${config.sheetName}" not found`)
  }

  // getDisplayValues 取得畫面上顯示的字串，與前端 coerceRow 預期的形狀一致，型別轉換由前端處理
  const values = sheet.getDataRange().getDisplayValues()
  const header = values[HEADER_ROW - 1] || []
  const idIndex = header.indexOf(config.idColumn)
  if (idIndex === -1) {
    throw apiError(`id column "${config.idColumn}" not found in sheet "${config.sheetName}"`)
  }

  // rows[i] 在 Sheet 上是第 HEADER_ROW + 1 + i 列
  return { sheet, header, idIndex, rows: values.slice(HEADER_ROW) }
}

// 以表頭為 key 的物件，即前端 coerceRow 接收的形狀
function rowObject (cache, row) {
  const object = {}
  for (let i = 0; i < cache.header.length; i++) {
    if (cache.header[i] !== '') {
      object[cache.header[i]] = row[i] === undefined ? '' : String(row[i])
    }
  }
  return object
}

// id 在 rows 中的索引，-1 表示沒有。重複的 id 直接擋下，Sheet 可能被手動修改
function findRow (cache, id) {
  let found = -1
  for (let i = 0; i < cache.rows.length; i++) {
    if (cache.rows[i][cache.idIndex] === id) {
      if (found !== -1) {
        throw apiError(`duplicate id "${id}"`)
      }
      found = i
    }
  }
  return found
}

// values 的 key 為 Sheet 的表頭文字，換成 1 起算的欄號。值原樣寫入
function changedCells (cache, values) {
  return Object.keys(values).map(header => {
    const index = cache.header.indexOf(header)
    if (index === -1) {
      throw apiError(`unknown column "${header}"`)
    }
    const value = values[header]
    return { column: index + 1, value: value === undefined || value === null ? '' : String(value) }
  })
}

// 整張表：捨棄沒有 id 的列，例如表尾的空列、手動留下的分隔列
function readTable (table) {
  // 修改時間刻意於讀取資料之前取得：讀取期間有其他寫入時，時間較舊，下次推送即判定為衝突
  const time = modifiedTime()
  const cache = readSheet(table)
  const rows = cache.rows
    .filter(row => row[cache.idIndex] !== '')
    .map(row => rowObject(cache, row))

  return { rows, modifiedTime: time }
}
