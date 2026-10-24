// 一次推送：整批操作（跨所有表）在 LockService 的鎖中執行，全有全無

function runBatch (operations, since) {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    throw apiError('後端忙碌中，請再試一次')
  }

  try {
    // 衝突比對與寫入在同一把鎖中。未帶 since 即為強制推送，不比對
    if (since && since !== modifiedTime()) {
      throw apiError('試算表已被別處修改', 'modified')
    }

    // 先規劃（只讀取），再寫入（只寫入）。結構檢查全在規劃階段，因此無須回滾
    const plans = planBatch(operations)
    for (const table of Object.keys(plans)) {
      writePlan(plans[table])
    }
    SpreadsheetApp.flush()

    return { modifiedTime: modifiedTime() }
  } finally {
    lock.releaseLock()
  }
}

// 依表分組，每張表一份 plan
function planBatch (operations) {
  const plans = {}

  for (const operation of operations) {
    if (!plans[operation.table]) {
      plans[operation.table] = { cache: readSheet(operation.table), creates: [], updates: [], deletes: [] }
    }
    planOperation(plans[operation.table], operation)
  }

  return plans
}

function planOperation (plan, operation) {
  const cache = plan.cache
  const id = operation.id
  if (!id) {
    throw apiError(`operation without id (${operation.kind})`)
  }

  const index = findRow(cache, id)
  const values = operation.values || {}

  switch (operation.kind) {
    case 'create': {
      // 冪等：id 已在表上，或同一批中剛新增過時，視為重送，不做任何事
      const queued = plan.creates.some(row => row[cache.idIndex] === id)
      if (index === -1 && !queued) {
        plan.creates.push(newRow(cache, id, values))
      }
      return
    }

    case 'update': {
      // 只記錄進入過佇列的那幾格，其餘的儲存格保持原狀
      plan.updates.push({ index: requireRow(index, id), changes: changedCells(cache, values) })
      return
    }

    case 'delete': {
      plan.deletes.push(requireRow(index, id))
      return
    }

    default: {
      throw apiError(`unknown kind "${operation.kind}"`)
    }
  }
}

function requireRow (index, id) {
  if (index === -1) {
    throw apiError(`row "${id}" not found`)
  }
  return index
}

// 新列：整列依表頭排列，未提供的欄位留空
function newRow (cache, id, values) {
  const row = cache.header.map(() => '')
  // id 原樣寫入：須與 Sheet 上的顯示值比對才找得到列
  row[cache.idIndex] = id
  for (const change of changedCells(cache, values)) {
    row[change.column - 1] = change.value
  }
  return row
}

// 寫入等同於在該格輸入，字串由 Sheet 解析。數字與日期刻意如此，見 README
function writePlan (plan) {
  const cache = plan.cache
  const sheet = cache.sheet

  // 只寫入修改過的儲存格，未送出的欄位保留 Sheet 上的值與公式
  for (const update of plan.updates) {
    const rowNumber = HEADER_ROW + 1 + update.index
    for (const change of update.changes) {
      sheet.getRange(rowNumber, change.column).setValue(change.value)
    }
  }

  // 新增的列接在資料之後，以連續範圍一次寫入
  if (plan.creates.length > 0) {
    sheet.getRange(HEADER_ROW + 1 + cache.rows.length, 1, plan.creates.length, cache.header.length)
      .setValues(plan.creates)
  }

  // 刪除列由下往上，以免後面的列號位移
  for (const index of plan.deletes.slice().sort((a, b) => b - a)) {
    sheet.deleteRow(HEADER_ROW + 1 + index)
  }
}
