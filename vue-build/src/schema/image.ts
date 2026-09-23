// Drive 分享連結裡的檔案 id：/d/<id>/ 或 ?id=<id>
const DRIVE_ID = /(?:\/d\/|[?&]id=)([\w-]{10,})/

// Drive 的縮圖端點：沿用瀏覽器已登入的 Google 帳號，不用後端也不會有 CORS 問題
function driveThumbnail (id: string, width: number): string {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`
}

// image 欄位的值轉成 <img src>，依內容判斷來源：行內 SVG、網址、Drive 檔案 id（或分享連結）。
// SVG 走 data: URI 而不是 v-html——當成圖片載入的 SVG 不能執行 script、綁事件或抓外部資源
export function imageSrc (value: unknown, width = 400): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const text = value.trim()
  if (text === '') {
    return null
  }

  if (text.startsWith('<svg')) {
    return `data:image/svg+xml,${encodeURIComponent(text)}`
  }

  const driveId = text.includes('drive.google.com') ? DRIVE_ID.exec(text)?.[1] : undefined
  if (driveId) {
    return driveThumbnail(driveId, width)
  }

  return /^https?:\/\//.test(text) ? text : driveThumbnail(text, width)
}
