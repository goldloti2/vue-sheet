// Apps Script Web App API

export type SheetAction = 'create' | 'update' | 'delete' | 'bulkUpdate'

interface ApiSuccess<T> {
  success: true
  data: T
}

interface ApiFailure {
  success: false
  error: { message: string }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure
