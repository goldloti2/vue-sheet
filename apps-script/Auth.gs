// 登入：用憑證換 token（約定見 docs/auth.md）
// 🔲 還沒有驗證：收到什麼都算成功、回固定的 placeholder，只用來確認前後端接得通
function login (credentials) {
  return { token: 'placeholder' }
}
