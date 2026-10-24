// Drive 分享連結中的檔案 id：/d/<id>/ 或 ?id=<id>
const DRIVE_ID = /(?:\/d\/|[?&]id=)([\w-]{10,})/

// Drive 的縮圖端點，使用瀏覽器已登入的 Google 帳號，不經過後端
function driveThumbnail (id: string, width: number): string {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`
}

// 將 image 欄位的值轉為 <img src>，來源為行內 SVG、網址或 Drive。SVG 刻意以 data: URI 載入，不使用 v-html
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
