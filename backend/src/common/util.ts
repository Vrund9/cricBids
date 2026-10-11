import { randomBytes, randomInt, createHash } from 'crypto'

/** URL-safe random token (default 18 bytes → 24 chars). */
export function randomToken(bytes = 18) {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `${base || 'auction'}-${randomBytes(3).toString('hex')}`
}

/** Unbiased Fisher–Yates shuffle using crypto randomness, so the order can't be predicted. */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const TEAM_COLORS = [
  '#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899',
  '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#E11D48',
  '#A855F7', '#0EA5E9', '#22C55E', '#EAB308',
]

export function shortNameFor(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase()
  return name.trim().slice(0, 3).toUpperCase() || 'TM'
}

export const ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'] as const

/** Map the many ways organisers write a role ("bat", "WK", "allrounder", "Batter") to a canonical role. */
export function normalizeRole(raw?: string | null): string {
  const v = (raw || '').toLowerCase().replace(/[^a-z]/g, '')
  if (!v) return 'All-rounder'
  if (v.includes('wk') || v.includes('keep')) return 'Wicket-keeper'
  if (v.includes('all') || v === 'ar') return 'All-rounder'
  if (v.includes('bowl')) return 'Bowler'
  if (v.includes('bat')) return 'Batsman'
  return raw!.trim().slice(0, 40)
}

/**
 * Google Forms → Drive photo uploads are the most common source of player photos.
 * Convert any Drive share/open link into a directly embeddable image URL.
 */
export function normalizePhotoUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined
  const url = String(raw).trim().split(/[\s,]+/)[0]
  if (!/^https?:\/\//i.test(url)) return undefined
  const driveId =
    url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)?.[1] ||
    url.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([\w-]+)/)?.[1]
  if (driveId) return `https://lh3.googleusercontent.com/d/${driveId}=w800`
  return url
}

export function toInt(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const n = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? Math.round(n) : undefined
}

export function cleanStr(value: unknown, max = 200): string | undefined {
  if (value === null || value === undefined) return undefined
  const s = String(value).trim()
  return s ? s.slice(0, max) : undefined
}
