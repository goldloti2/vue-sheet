// 認證：登入換 token、每個請求驗 token（約定見 docs/auth.md）

// 依 Config.gs 的 AUTH 取模組。放在函式裡查：各檔的頂層依載入順序執行，請求進來時才保證全部載完
function authModule () {
  if (AUTH === null) {
    return null
  }
  if (AUTH === 'password') {
    return PasswordAuth
  }
  throw new Error(`unknown AUTH: ${AUTH}`)
}

function login (credentials) {
  const auth = authModule()
  if (!auth) {
    throw new Error('login is not enabled')
  }
  return { token: auth.login(credentials) }
}

// 讀寫之前先過這關；AUTH 是 null 就不檢查。回傳續期用的新 token（不需要續期就是 undefined）
function authorize (token) {
  const auth = authModule()
  return auth ? auth.verify(token || '').token : undefined
}

// ===== 示範模組：帳號密碼 =====

const PasswordAuth = { login: passwordLogin, verify: verifyToken }

const TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60
const TOKEN_RENEW_BELOW_SECONDS = TOKEN_LIFETIME_SECONDS / 2

function passwordLogin (credentials) {
  const user = readUser(credentials.username)
  // 帳號不存在與密碼錯誤回同一句，不讓人試出哪些帳號存在
  if (!user || hashPassword(credentials.password || '', user.salt) !== user.hash) {
    throw apiError('帳號或密碼錯誤', 'unauthorized')
  }
  return issueToken(credentials.username)
}

// 🔲 還沒有簽章：token 只是 base64url(message)，任何人都改得了
function issueToken (username) {
  const message = { user: username, exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS }
  return base64url(JSON.stringify(message))
}

function verifyToken (token) {
  const message = decodeMessage(token)
  if (!message || typeof message.user !== 'string' || typeof message.exp !== 'number') {
    throw apiError('登入資訊無效，請重新登入', 'unauthorized')
  }
  if (message.exp < Date.now() / 1000) {
    throw apiError('登入已過期，請重新登入', 'expired')
  }
  // 帳號被刪掉，手上的 token 就跟著失效
  if (!readUser(message.user)) {
    throw apiError('登入資訊無效，請重新登入', 'unauthorized')
  }
  const renew = message.exp - Date.now() / 1000 < TOKEN_RENEW_BELOW_SECONDS
  return { user: message.user, token: renew ? issueToken(message.user) : undefined }
}

function base64url (text) {
  return Utilities.base64EncodeWebSafe(text, Utilities.Charset.UTF_8).replace(/=+$/, '')
}

// 解不開就是 null（亂填的 token）
function decodeMessage (token) {
  try {
    const padded = token + '='.repeat((4 - token.length % 4) % 4)
    const bytes = Utilities.base64DecodeWebSafe(padded)
    return JSON.parse(Utilities.newBlob(bytes).getDataAsString('UTF-8'))
  } catch {
    return null
  }
}

// SHA-256(密碼 + salt)，以 base64 存。Apps Script 沒有 bcrypt 這類密碼專用的雜湊
function hashPassword (password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt, Utilities.Charset.UTF_8)
  return Utilities.base64Encode(bytes)
}

// 一個帳號一筆 Script Property，在「專案設定 → 指令碼屬性」看得到、也能直接刪
function userKey (username) {
  return `AUTH_USER_${username}`
}

function readUser (username) {
  const value = PropertiesService.getScriptProperties().getProperty(userKey(username))
  return value ? JSON.parse(value) : null
}

// ===== 管理員在編輯器裡手動執行 =====
// 「執行」鈕不能帶參數，所以先填這兩個值、從上方選單選 addUser 或 removeUser 再按執行。
// 執行完把密碼清掉，不要留在程式碼裡
const ACCOUNT_USERNAME = ''
const ACCOUNT_PASSWORD = ''

function addUser () {
  if (!ACCOUNT_USERNAME || !ACCOUNT_PASSWORD) {
    throw new Error('先填 ACCOUNT_USERNAME 與 ACCOUNT_PASSWORD')
  }
  // salt 每個帳號各自隨機一組，改密碼時也重新產生
  const salt = Utilities.getUuid()
  PropertiesService.getScriptProperties()
    .setProperty(userKey(ACCOUNT_USERNAME), JSON.stringify({ salt, hash: hashPassword(ACCOUNT_PASSWORD, salt) }))
  console.log(`已加入（或更新）帳號 ${ACCOUNT_USERNAME}`)
}

function removeUser () {
  if (!ACCOUNT_USERNAME) {
    throw new Error('先填 ACCOUNT_USERNAME')
  }
  PropertiesService.getScriptProperties().deleteProperty(userKey(ACCOUNT_USERNAME))
  console.log(`已刪除帳號 ${ACCOUNT_USERNAME}`)
}
