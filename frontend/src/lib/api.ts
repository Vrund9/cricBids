export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '')
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

const TOKEN_KEY = 'cricbid.token'

export function getToken() {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable (private mode) — session lasts for this tab only */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message)
  }
}

/** True when the API refused because the tournament's plan doesn't include something. */
export const isPlanLimit = (e: unknown) => e instanceof ApiError && e.code === 'PLAN_LIMIT'

type Body = Record<string, unknown> | unknown[] | FormData

export async function api<T = unknown>(path: string, opts: { method?: string; body?: Body; auth?: boolean; signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData
  if (opts.body && !isForm) headers['content-type'] = 'application/json'
  const token = opts.auth === false ? null : getToken()
  if (token) headers.authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method || (opts.body ? 'POST' : 'GET'),
      headers,
      body: opts.body ? (isForm ? (opts.body as FormData) : JSON.stringify(opts.body)) : undefined,
      signal: opts.signal,
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.")
  }
  const text = await res.text()
  const data = text ? safeJson(text) : null
  if (!res.ok) {
    const msg = (data as any)?.message
    const message = Array.isArray(msg) ? msg[0] : msg || res.statusText || 'Something went wrong'
    if (res.status === 401 && token && typeof window !== 'undefined') {
      setToken(null)
      window.dispatchEvent(new Event('cricbid:logout'))
    }
    const code = (data as any)?.code as string | undefined
    if (code === 'PLAN_LIMIT' && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cricbid:plan-limit', { detail: message }))
    throw new ApiError(res.status, message, code)
  }
  return data as T
}

function safeJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function uploadImage(file: File, path = '/uploads'): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new ApiError(400, 'Image must be under 5 MB')
  const form = new FormData()
  form.append('file', await downscale(file))
  const res = await api<{ url: string }>(path, { body: form })
  return res.url
}

/** Phones upload 4–12 MB photos; shrink them in the browser before sending. */
async function downscale(file: File, max = 900): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 600_000) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

/** Server-side fetch for metadata / OG images. Never throws. */
export async function serverGet<T>(path: string, revalidate = 30): Promise<T | null> {
  const base = (process.env.API_INTERNAL_URL || API_URL).replace(/\/$/, '')
  try {
    const res = await fetch(`${base}${path}`, { next: { revalidate } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}
