// 單張表的讀取與表頭對應。批次的順序、鎖、寫入都在 Batch.gs

function spreadsheet () {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet()
}

// 整個檔案的修改時間，當衝突比對的基準
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

// 一張表只讀這一次：表頭 + 全部資料列，之後找列、擋重複 id、算列號都用這份快取
function readSheet (table) {
  const config = tableConfig(table)
  const sheet = spreadsheet().getSheetByName(config.sheetName)
  if (!sheet) {
    throw apiError(`sheet "${config.sheetName}" not found`)
  }

  // getDisplayValues：拿到的是畫面上看到的字串，跟前端 coerceRow 預期的形狀一致（型別轉換在前端做）
  const values = sheet.getDataRange().getDisplayValues()
  const header = values[HEADER_ROW - 1] || []
  const idIndex = header.indexOf(config.idColumn)
  if (idIndex === -1) {
    throw apiError(`id column "${config.idColumn}" not found in sheet "${config.sheetName}"`)
  }

  // rows[i] 在 Sheet 上是第 HEADER_ROW + 1 + i 列
  return { sheet, header, idIndex, rows: values.slice(HEADER_ROW) }
}

// 表頭當 key 的物件，就是前端 coerceRow 吃的形狀
function rowObject (cache, row) {
  const object = {}
  for (let i = 0; i < cache.header.length; i++) {
    if (cache.header[i] !== '') {
      object[cache.header[i]] = row[i] === undefined ? '' : String(row[i])
    }
  }
  return object
}

// id 在 rows 裡的索引，-1 是沒有。重複的 id 直接擋掉——Sheet 可以手動打開來改，不能假設 id 只由前端產生
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

// values 的 key 是 Sheet 的表頭文字，換成 1 起算的欄號；值原封不動寫下去
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

// 整張表：丟掉沒有 id 的列（表尾的空列、手動留的分隔列）
function readTable (table) {
  const cache = readSheet(table)
  const rows = cache.rows
    .filter(row => row[cache.idIndex] !== '')
    .map(row => rowObject(cache, row))

  return { rows, modifiedTime: modifiedTime() }
}
