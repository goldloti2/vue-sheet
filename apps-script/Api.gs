// token 一律放在網址（?token=），GET 與 POST 皆同。驗證於開啟試算表之前完成
function doGet (e) {
  const params = e.parameter || {}
  return respond(() => {
    const token = authorize(params.token)
    return { token, data: readTable(params.table) }
  })
}

function doPost (e) {
  return respond(() => {
    // 前端刻意使用 Content-Type: text/plain，避免 Web App 無法回應的 CORS 預檢。內容仍為 JSON
    const body = JSON.parse(e.postData.contents)
    if (body.action === 'login') {
      return { data: login(body.credentials || {}) }
    }
    const token = authorize((e.parameter || {}).token)
    return { token, data: runBatch(body.operations || [], body.since) }
  })
}

// 錯誤只回傳一句訊息。code 只用於前端須分辨的 'modified'（衝突）、'unauthorized'、'expired'
function apiError (message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

// 成敗一律放在 body 的 success，前端不看 status。token 為 undefined 時，JSON 略過該欄
function respond (handler) {
  let payload
  try {
    const { data, token } = handler()
    payload = { success: true, data, token }
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
