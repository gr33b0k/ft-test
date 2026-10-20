export class ApiError extends Error {
  status: number
  details?: string[]

  constructor(status: number, message: string, details?: string[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new ApiError(0, 'Не удалось связаться с сервером')
  }

  if (!res.ok) {
    let message = res.statusText
    let details: string[] | undefined
    try {
      const body = await res.json()
      if (typeof body.error === 'string') message = body.error
      if (Array.isArray(body.details)) details = body.details
    } catch {
      // тело с ошибкой не в JSON — остаётся стандартный текст статуса
    }
    throw new ApiError(res.status, message, details)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function del(path: string): Promise<void> {
  return request<void>(path, { method: 'DELETE' })
}
