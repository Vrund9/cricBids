import { BadRequestException } from '@nestjs/common'

/**
 * Platform settings editable from the admin panel. Stored in the AppSetting table and
 * cached in memory so hot paths (plan limits, billing mode) stay synchronous.
 */
export interface Announcement {
  text: string
  tone: 'info' | 'success' | 'warning'
}

export interface PlatformSettings {
  /** When false, new accounts can't be created (email or Google). Existing users can still log in. */
  signupsEnabled: boolean
  /** Banner shown at the top of the organiser app. */
  announcement: Announcement | null
  /** 'auto' follows the BILLING_MODE env var (demo outside production). */
  billingMode: 'auto' | 'demo' | 'disabled'
  freeMaxTeams: number
  freeMaxPlayers: number
  proMaxTeams: number
  proMaxPlayers: number
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  signupsEnabled: true,
  announcement: null,
  billingMode: 'auto',
  freeMaxTeams: 6,
  freeMaxPlayers: 60,
  proMaxTeams: 16,
  proMaxPlayers: 500,
}

let current: PlatformSettings = { ...DEFAULT_SETTINGS }

export const settings = (): PlatformSettings => current

/** Replace the cache from stored rows; unknown keys and bad values fall back to defaults. */
export function loadSettings(rows: { key: string; value: unknown }[]) {
  const next = { ...DEFAULT_SETTINGS }
  for (const { key, value } of rows) {
    if (!(key in DEFAULT_SETTINGS)) continue
    try {
      Object.assign(next, { [key]: validateSetting(key as keyof PlatformSettings, value) })
    } catch {
      // keep default
    }
  }
  current = next
}

const int = (key: string, v: unknown, min: number, max: number) => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new BadRequestException(`${key} must be a whole number between ${min} and ${max}`)
  return v
}

export function validateSetting<K extends keyof PlatformSettings>(key: K, value: unknown): PlatformSettings[K] {
  switch (key) {
    case 'signupsEnabled':
      if (typeof value !== 'boolean') throw new BadRequestException('signupsEnabled must be true or false')
      return value as PlatformSettings[K]
    case 'announcement': {
      if (value === null) return null as PlatformSettings[K]
      const a = value as Partial<Announcement>
      const text = typeof a?.text === 'string' ? a.text.trim() : ''
      if (!text) return null as PlatformSettings[K]
      if (text.length > 280) throw new BadRequestException('Announcement must be 280 characters or fewer')
      const tone = a.tone === 'success' || a.tone === 'warning' ? a.tone : 'info'
      return { text, tone } as PlatformSettings[K]
    }
    case 'billingMode':
      if (value !== 'auto' && value !== 'demo' && value !== 'disabled') throw new BadRequestException('billingMode must be auto, demo or disabled')
      return value as PlatformSettings[K]
    case 'freeMaxTeams':
    case 'proMaxTeams':
      return int(key, value, 2, 64) as PlatformSettings[K]
    case 'freeMaxPlayers':
    case 'proMaxPlayers':
      return int(key, value, 10, 5000) as PlatformSettings[K]
    default:
      throw new BadRequestException(`Unknown setting: ${String(key)}`)
  }
}
