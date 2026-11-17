export type PreviewDevice = 'desktop' | 'mobile'

// 電腦版的頁面寬度，可用寬度不足時縮小顯示
export const DESKTOP_WIDTH = 1280
// 手機版的頁面大小（Galaxy S20 Ultra），整頁縮小至完整放入，並置中
export const MOBILE_WIDTH = 412
export const MOBILE_HEIGHT = 915
// 預覽欄的寬度為手機版縮小後的寬度加上左右的留白
export const PREVIEW_GUTTER = 16
// 工具列的高度（v-toolbar 的 compact）
export const PREVIEW_TOOLBAR_HEIGHT = 48
