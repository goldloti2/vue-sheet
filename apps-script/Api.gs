function doGet (e) {
  return respond(() => readTable((e.parameter || {}).table))
}

function doPost (e) {
  return respond(() => {
    // 前端刻意用 Content-Type: text/plain（application/json 會觸發 Web App 回不了的 CORS 預檢），內容仍是 JSON
    const body = JSON.parse(e.postData.contents)
    if (body.action === 'login') {
      return login(body.credentials || {})
    }
    return runBatch(body.operations || [], body.since)
  })
}

// 錯誤只回一句訊息；code 只用在前端要分辨的情況：'modified'（衝突）、'unauthorized'（登入失敗）
function apiError (message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

// Web App 幾乎只能回 200，所以成敗一律放在 body 的 success 裡，前端不看 status
function respond (handler) {
  let payload
  try {
    payload = { success: true, data: handler() }
  } catch (error) {
    const failure = { message: error && error.message ? error.message : String(error) }
    if (error && error.code) {
      failure.code = error.code
    }
    payload = { success: false, error: failure }
  }

  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON)
}
