// token 一律在網址上（?token=），GET 與 POST 都一樣；驗證在開試算表之前
function doGet (e) {
  const params = e.parameter || {}
  return respond(() => {
    const token = authorize(params.token)
    return { token, data: readTable(params.table) }
  })
}

function doPost (e) {
  return respond(() => {
    // 前端刻意用 Content-Type: text/plain（application/json 會觸發 Web App 回不了的 CORS 預檢），內容仍是 JSON
    const body = JSON.parse(e.postData.contents)
    if (body.action === 'login') {
      return { data: login(body.credentials || {}) }
    }
    const token = authorize((e.parameter || {}).token)
    return { token, data: runBatch(body.operations || [], body.since) }
  })
}

// 錯誤只回一句訊息；code 只用在前端要分辨的情況：
// 'modified'（衝突）、'unauthorized'（登入失敗或 token 無效）、'expired'（token 過期）
function apiError (message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

// Web App 幾乎只能回 200，所以成敗一律放在 body 的 success 裡，前端不看 status。
// handler 回傳 { data, token? }：token undefined 時 JSON 會略過
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
