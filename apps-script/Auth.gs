// 登入：用憑證換 token（約定見 docs/auth.md）
// 🔲 token 還是固定的 placeholder
function login (credentials) {
  const user = readUser(credentials.username)
  // 帳號不存在與密碼錯誤回同一句，不讓人試出哪些帳號存在
  if (!user || hashPassword(credentials.password || '', user.salt) !== user.hash) {
    throw apiError('帳號或密碼錯誤', 'unauthorized')
  }
  return { token: 'placeholder' }
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
