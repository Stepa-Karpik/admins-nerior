export type Role = "user" | "admin"
export type FeedType = "notification" | "update" | "reminder" | "ticket"
export type TicketStatus = "open" | "closed"

export type ApiEnvelope<T> = {
  data: T | null
  meta?: { pagination?: { total: number; limit: number; offset: number }; [key: string]: unknown }
  error?: { code: string; message: string; details?: unknown } | null
}

export type AuthPayload = {
  tokens?: { access_token: string; refresh_token: string }
  user_id?: string
  email?: string
  username?: string
  display_name?: string | null
  role?: Role
}

export type Profile = {
  user_id: string
  email: string
  username: string
  display_name?: string | null
  role: Role
}

export type AdminUser = {
  user_id: string
  email: string
  username: string
  display_name?: string | null
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export type FeedItem = {
  id: string
  type: FeedType
  title: string
  body: string
  target_username?: string | null
  published_at?: string | null
  created_at: string
  updated_at: string
}

export type SupportMessage = {
  id: string
  author_role: "user" | "admin" | "system"
  body: string
  created_at: string
}

export type SupportTicket = {
  id: string
  public_number: number
  user_id: string
  user_username?: string | null
  topic: string
  subtopic: string
  subject: string
  status: TicketStatus
  created_at: string
  updated_at: string
  closed_at?: string | null
  messages?: SupportMessage[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1"
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "https://auth.nerior.ru/login"
let accessToken: string | null = null

function apiUrl(path: string) {
  if (path.startsWith("http")) return path
  const normalized = path.startsWith("/") ? path : `/${path}`
  if (normalized.startsWith("/api/")) return normalized
  return `${API_BASE}${normalized}`
}

function getRefreshToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("sp_refresh_token")
}

function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) window.localStorage.setItem("sp_refresh_token", token)
  else window.localStorage.removeItem("sp_refresh_token")
}

export function clearSession() {
  accessToken = null
  setRefreshToken(null)
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) return false
  const res = await fetch(apiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  })
  if (!res.ok) return false
  const envelope = (await res.json()) as ApiEnvelope<AuthPayload>
  if (!envelope.data?.tokens) return false
  accessToken = envelope.data.tokens.access_token
  setRefreshToken(envelope.data.tokens.refresh_token)
  return true
}

export async function exchangeSharedSession() {
  const envelope = await request<AuthPayload>("/auth/sso/exchange", { method: "POST", credentials: "include" }, false)
  if (envelope.data?.tokens) {
    accessToken = envelope.data.tokens.access_token
    setRefreshToken(envelope.data.tokens.refresh_token)
  }
  return envelope
}

export async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) }
  if (!(init.body instanceof FormData)) headers["Content-Type"] = headers["Content-Type"] || "application/json"
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let res = await fetch(apiUrl(path), { ...init, headers })
  if (res.status === 401 && retry && (await refreshAccessToken())) {
    headers.Authorization = `Bearer ${accessToken}`
    res = await fetch(apiUrl(path), { ...init, headers })
  }

  try {
    const body = (await res.json()) as ApiEnvelope<T>
    if (!res.ok && !body.error) return { data: null, error: { code: "HTTP_ERROR", message: `HTTP ${res.status}` } }
    return body
  } catch {
    return { data: null, error: { code: "HTTP_ERROR", message: `HTTP ${res.status}` } }
  }
}

export async function ensureAdminProfile() {
  if (!getRefreshToken()) await exchangeSharedSession()
  const profile = await request<Profile>("/profile")
  if (profile.error || !profile.data) return null
  if (profile.data.role !== "admin") return null
  return profile.data
}

export function redirectToAuth() {
  if (typeof window === "undefined") return
  const returnTo = encodeURIComponent(window.location.href)
  window.location.href = `${AUTH_URL}?return_to=${returnTo}`
}

export async function logout() {
  const refresh = getRefreshToken()
  if (refresh) await request("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: refresh }) }).catch(() => null)
  clearSession()
  redirectToAuth()
}
