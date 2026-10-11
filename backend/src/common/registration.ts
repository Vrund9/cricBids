import { BadRequestException } from '@nestjs/common'
import { cleanStr, normalizePhotoUrl, normalizeRole, ROLES, toInt } from './util'

export type FieldType = 'text' | 'textarea' | 'number' | 'tel' | 'email' | 'select' | 'photo'

export interface RegField {
  key: string
  label: string
  type: FieldType
  required: boolean
  enabled: boolean
  options?: string[]
  /** Built-in fields map onto Player columns; custom ones go into Player.extra */
  builtin?: boolean
  /** Locked fields can't be disabled (name, role) */
  locked?: boolean
}

/** Player columns a built-in field writes to. */
export const BUILTIN_KEYS = ['name', 'phone', 'role', 'photoUrl', 'battingStyle', 'bowlingStyle', 'age', 'city', 'email'] as const

export const DEFAULT_REG_FIELDS: RegField[] = [
  { key: 'name', label: 'Full name', type: 'text', required: true, enabled: true, builtin: true, locked: true },
  { key: 'phone', label: 'Mobile number', type: 'tel', required: true, enabled: true, builtin: true },
  { key: 'role', label: 'Playing role', type: 'select', required: true, enabled: true, builtin: true, locked: true, options: [...ROLES] },
  { key: 'photoUrl', label: 'Photo', type: 'photo', required: false, enabled: true, builtin: true },
  { key: 'battingStyle', label: 'Batting style', type: 'select', required: false, enabled: true, builtin: true, options: ['Right-hand bat', 'Left-hand bat'] },
  {
    key: 'bowlingStyle', label: 'Bowling style', type: 'select', required: false, enabled: true, builtin: true,
    options: ['Right-arm fast', 'Right-arm medium', 'Right-arm off-spin', 'Right-arm leg-spin', 'Left-arm fast', 'Left-arm medium', 'Left-arm orthodox', 'Left-arm wrist-spin', 'Does not bowl'],
  },
  { key: 'age', label: 'Age', type: 'number', required: false, enabled: true, builtin: true },
  { key: 'city', label: 'City / Area', type: 'text', required: false, enabled: false, builtin: true },
  { key: 'email', label: 'Email', type: 'email', required: false, enabled: false, builtin: true },
]

const TYPES: FieldType[] = ['text', 'textarea', 'number', 'tel', 'email', 'select', 'photo']

/** Validate and normalise an organiser-supplied field list. Built-ins are always present. */
export function sanitizeFields(input: unknown): RegField[] {
  if (!Array.isArray(input)) throw new BadRequestException('registrationFields must be an array')
  const byKey = new Map<string, any>(input.filter((f) => f && typeof f.key === 'string').map((f) => [f.key, f]))
  const builtins = DEFAULT_REG_FIELDS.map((def) => {
    const f = byKey.get(def.key) || {}
    return {
      ...def,
      label: cleanStr(f.label, 80) || def.label,
      enabled: def.locked ? true : f.enabled !== undefined ? !!f.enabled : def.enabled,
      required: def.locked ? true : !!(f.required ?? def.required),
      options: def.type === 'select' && Array.isArray(f.options) && f.options.length ? f.options.map((o: unknown) => cleanStr(o, 60)).filter(Boolean) : def.options,
    }
  })
  const custom: RegField[] = input
    .filter((f: any) => f && !(BUILTIN_KEYS as readonly string[]).includes(f.key))
    .slice(0, 20)
    .map((f: any, i: number) => {
      const type: FieldType = TYPES.includes(f.type) && f.type !== 'photo' ? f.type : 'text'
      const options = type === 'select' ? (Array.isArray(f.options) ? f.options : []).map((o: unknown) => cleanStr(o, 60)).filter(Boolean).slice(0, 30) : undefined
      if (type === 'select' && !options?.length) throw new BadRequestException(`Question "${f.label}" needs at least one option`)
      const label = cleanStr(f.label, 120)
      if (!label) throw new BadRequestException('Every custom question needs a label')
      const key = typeof f.key === 'string' && /^q_[a-z0-9_]{1,40}$/i.test(f.key) ? f.key : `q_${Date.now().toString(36)}${i}`
      return { key, label, type, required: !!f.required, enabled: f.enabled !== false, options }
    })
  return [...builtins, ...custom]
}

/**
 * Validate a registration submission against the form config and split it into
 * Player columns + `extra` answers.
 */
export function parseSubmission(fields: RegField[], body: Record<string, unknown>) {
  const out: Record<string, any> = {}
  const extra: Record<string, string> = {}
  for (const f of fields) {
    if (!f.enabled) continue
    const raw = body[f.key]
    const str = cleanStr(raw, f.type === 'textarea' ? 1000 : 200)
    if (!str) {
      if (f.required) throw new BadRequestException(`${f.label} is required`)
      continue
    }
    let value: string | number | undefined = str
    if (f.type === 'number') {
      value = toInt(str)
      if (value === undefined) throw new BadRequestException(`${f.label} must be a number`)
    }
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) throw new BadRequestException(`${f.label} must be a valid email`)
    if (f.type === 'tel' && str.replace(/\D/g, '').length < 7) throw new BadRequestException(`${f.label} must be a valid phone number`)
    if (f.type === 'select' && f.options?.length && !f.options.includes(str)) throw new BadRequestException(`Choose a valid option for ${f.label}`)
    if (f.type === 'photo') {
      value = normalizePhotoUrl(str)
      if (!value) {
        if (f.required) throw new BadRequestException(`${f.label} is required`)
        continue
      }
    }
    if ((BUILTIN_KEYS as readonly string[]).includes(f.key)) out[f.key] = value
    else extra[f.label] = String(value)
  }
  if (out.age !== undefined && (out.age < 5 || out.age > 90)) throw new BadRequestException('Please enter a valid age')
  out.role = normalizeRole(out.role)
  return { ...out, extra: Object.keys(extra).length ? extra : undefined } as {
    name: string
    role: string
    phone?: string
    photoUrl?: string
    battingStyle?: string
    bowlingStyle?: string
    age?: number
    city?: string
    email?: string
    extra?: Record<string, string>
  }
}
