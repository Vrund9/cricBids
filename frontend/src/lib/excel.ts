import type { Player, RegField, Team, Tournament } from './types'

/** Player fields a spreadsheet column can be mapped to. */
export const TARGETS = [
  { key: 'name', label: 'Player name', required: true },
  { key: 'role', label: 'Role' },
  { key: 'category', label: 'Category / Tier' },
  { key: 'phone', label: 'Mobile' },
  { key: 'photoUrl', label: 'Photo URL' },
  { key: 'battingStyle', label: 'Batting style' },
  { key: 'bowlingStyle', label: 'Bowling style' },
  { key: 'age', label: 'Age' },
  { key: 'city', label: 'City' },
  { key: 'email', label: 'Email' },
  { key: 'basePrice', label: 'Base price' },
] as const

export type TargetKey = (typeof TARGETS)[number]['key'] | 'extra' | 'ignore'

const SYNONYMS: Record<Exclude<TargetKey, 'extra' | 'ignore'>, string[]> = {
  name: ['name', 'player name', 'full name', 'player', 'your name', 'name of player', 'player full name', 'name of the player', 'players name'],
  role: ['role', 'playing role', 'specialization', 'specialisation', 'speciality', 'skill', 'player type', 'player role', 'type', 'expertise'],
  category: ['category', 'tier', 'grade', 'group', 'pool', 'set', 'class', 'level'],
  phone: ['phone', 'mobile', 'contact', 'whatsapp', 'mobile number', 'phone number', 'contact number', 'mobile no', 'whatsapp number', 'cell'],
  email: ['email', 'e mail', 'email address', 'mail', 'email id'],
  city: ['city', 'area', 'location', 'town', 'village', 'address', 'locality', 'place'],
  age: ['age', 'age in years', 'player age'],
  photoUrl: ['photo', 'image', 'picture', 'pic', 'photo url', 'upload photo', 'your photo', 'image url', 'photograph', 'player photo', 'profile photo', 'passport size photo'],
  battingStyle: ['batting', 'batting style', 'bat style', 'batting hand', 'batting type'],
  bowlingStyle: ['bowling', 'bowling style', 'bowl style', 'bowling type', 'bowling arm', 'bowling action'],
  basePrice: ['base price', 'base', 'price', 'reserve price', 'starting price', 'base amount'],
}

const IGNORE = ['', 'timestamp', 'sr no', 'sr', 's no', 'serial', 'serial no', 'no', 'id', '#', 'email address for receipt']

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** How a column was matched, so the import screen can say how sure it is. */
export type MatchHow = 'exact' | 'similar' | 'content' | 'remembered' | 'none'

type FieldKey = Exclude<TargetKey, 'extra' | 'ignore'>

/** Edit distance, for typos like "Plyer Nme" or "Mobil No". */
function lev(a: string, b: string) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]
    d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return d[b.length]
}

/** 0–100: how much a header looks like a synonym (exact, whole-word, word overlap or a typo). */
function headerScore(n: string, syn: string) {
  if (n === syn) return 100
  if (new RegExp(`\\b${syn}\\b`).test(n)) return 60 + Math.min(syn.length, 20)
  const a = new Set(n.split(' '))
  const b = syn.split(' ')
  const overlap = b.filter((w) => a.has(w) || [...a].some((x) => x.length > 3 && w.length > 3 && lev(x, w) <= 1)).length
  if (overlap === b.length) return 55
  const dist = lev(n, syn)
  const ratio = 1 - dist / Math.max(n.length, syn.length)
  return ratio >= 0.75 && syn.length >= 4 ? Math.round(ratio * 50) : 0
}

const ROLE_WORDS = /^(bat|batsman|batter|batting|bowl|bowler|bowling|all ?rounder|ar|wk|keeper|wicket ?keeper|wicketkeeper)\b/i

/** Guess a column from its values when the header says nothing useful ("Column 3", "Q4", "Info"). */
function contentGuess(values: string[]): FieldKey | null {
  const v = values.map((x) => x.trim()).filter(Boolean).slice(0, 40)
  if (v.length < 2) return null
  const share = (re: RegExp) => v.filter((x) => re.test(x)).length / v.length
  if (share(/^\S+@\S+\.\S+$/) > 0.7) return 'email'
  if (share(/^https?:\/\//i) > 0.7) return 'photoUrl'
  if (share(/^\+?[\d\s-]{10,15}$/) > 0.7) return 'phone'
  if (share(ROLE_WORDS) > 0.6) return 'role'
  if (share(/^(left|right|lh|rh)/i) > 0.6) return /bowl|arm|spin|pace|medium|fast/i.test(v.join(' ')) ? 'bowlingStyle' : 'battingStyle'
  if (share(/^\d{1,2}$/) > 0.8 && v.every((x) => !/^\d+$/.test(x) || (Number(x) >= 5 && Number(x) <= 90))) return 'age'
  // Category values look like tiers (A, B+, Marquee, Gold), not just any short word like jersey sizes.
  if (share(/^(marquee|icon|elite|platinum|gold|silver|bronze|[a-e]\+?|[1-5])$/i) > 0.8) return 'category'
  if (share(/^[A-Za-z][A-Za-z.' -]{2,40}$/) > 0.8 && v.some((x) => x.includes(' ')) && new Set(v).size > v.length * 0.8) return 'name'
  return null
}

const MEMORY_KEY = 'cricbid.import-mapping'

/** Mappings the organiser corrected by hand are remembered per header text for next time. */
export function rememberMapping(mapping: Record<string, TargetKey>) {
  try {
    const saved = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}') as Record<string, TargetKey>
    for (const [h, v] of Object.entries(mapping)) saved[norm(h)] = v
    localStorage.setItem(MEMORY_KEY, JSON.stringify(saved))
  } catch {}
}

function remembered(): Record<string, TargetKey> {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}')
  } catch {
    return {}
  }
}

/**
 * Guess which player field each column holds, in order of confidence:
 * the organiser's own earlier choice → header text (exact, word, typo-tolerant) → the values themselves.
 * Anything still unknown is kept as "extra info", so no data is ever dropped silently.
 */
export function autoMap(headers: string[], rows: Record<string, unknown>[] = []): { mapping: Record<string, TargetKey>; how: Record<string, MatchHow> } {
  const mapping: Record<string, TargetKey> = {}
  const how: Record<string, MatchHow> = {}
  const used = new Set<string>()
  const memory = remembered()

  for (const h of headers) {
    const m = memory[norm(h)]
    if (m && (m === 'extra' || m === 'ignore' || !used.has(m))) {
      mapping[h] = m
      how[h] = 'remembered'
      if (m !== 'extra' && m !== 'ignore') used.add(m)
    }
  }

  const scores: { header: string; key: FieldKey; score: number }[] = []
  for (const h of headers) {
    if (mapping[h]) continue
    const n = norm(h)
    for (const [key, syns] of Object.entries(SYNONYMS) as [FieldKey, string[]][]) {
      const score = Math.max(...syns.map((syn) => headerScore(n, syn)))
      if (score >= 35) scores.push({ header: h, key, score })
    }
  }
  scores.sort((a, b) => b.score - a.score)
  for (const s of scores) {
    if (mapping[s.header] || used.has(s.key)) continue
    mapping[s.header] = s.key
    how[s.header] = s.score >= 60 ? 'exact' : 'similar'
    used.add(s.key)
  }

  for (const h of headers) {
    if (mapping[h]) continue
    if (IGNORE.includes(norm(h))) {
      mapping[h] = 'ignore'
      how[h] = 'exact'
      continue
    }
    const guess = contentGuess(rows.map((r) => (r[h] instanceof Date ? '' : String(r[h] ?? ''))))
    if (guess && !used.has(guess)) {
      mapping[h] = guess
      how[h] = 'content'
      used.add(guess)
    } else {
      mapping[h] = 'extra'
      how[h] = 'none'
    }
  }
  return { mapping, how }
}

export interface Sheet {
  fileName: string
  sheetNames: string[]
  sheet: string
  headers: string[]
  rows: Record<string, unknown>[]
}

export async function readWorkbook(file: File, sheetName?: string): Promise<Sheet> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheet = sheetName && wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0]
  const ws = wb.Sheets[sheet]
  // Find the header row: the first row with at least 2 non-empty cells (skips title rows).
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: '' })
  const headerIdx = Math.max(0, grid.findIndex((r) => r.filter((c) => String(c).trim()).length >= 2))
  const rawHeaders = (grid[headerIdx] || []).map((h, i) => String(h).trim() || `Column ${i + 1}`)
  const seen = new Map<string, number>()
  const headers = rawHeaders.map((h) => {
    const n = (seen.get(h) ?? 0) + 1
    seen.set(h, n)
    return n > 1 ? `${h} (${n})` : h
  })
  const rows = grid
    .slice(headerIdx + 1)
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])))
    .filter((r) => Object.values(r).some((v) => String(v).trim()))
  return { fileName: file.name, sheetNames: wb.SheetNames, sheet, headers, rows }
}

export function toPlayers(rows: Record<string, unknown>[], mapping: Record<string, TargetKey>) {
  const out: Record<string, unknown>[] = []
  for (const row of rows) {
    const p: Record<string, unknown> = {}
    const extra: Record<string, string> = {}
    for (const [header, target] of Object.entries(mapping)) {
      const raw = row[header]
      const v = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw ?? '').trim()
      if (!v || target === 'ignore') continue
      if (target === 'extra') extra[header.slice(0, 60)] = v.slice(0, 500)
      else if (target === 'age' || target === 'basePrice') {
        const n = Math.round(Number(v.replace(/[^0-9.]/g, '')))
        if (Number.isFinite(n) && n > 0 && (target !== 'age' || (n >= 5 && n <= 90))) p[target] = n
      } else p[target] = v.slice(0, target === 'photoUrl' ? 1000 : 120)
    }
    if (!p.name) continue
    if (Object.keys(extra).length) p.extra = extra
    out.push(p)
  }
  return out
}

/**
 * Template whose columns match the registration form, so offline and online lists merge cleanly.
 * `categories` is null for tournaments without categories, which leaves the Category column out.
 */
export async function downloadTemplate(fields: RegField[], tournamentName: string, categories: string[] | null) {
  const XLSX = await import('xlsx')
  const cols = fields.filter((f) => f.enabled && f.type !== 'photo' && f.key !== 'category').map((f) => f.label)
  if (fields.some((f) => f.enabled && f.type === 'photo')) cols.push('Photo URL')
  if (categories?.length) cols.push('Category')
  cols.push('Base Price')
  const sample = (i: number) =>
    cols.map((c) => {
      const f = fields.find((x) => x.label === c)
      if (f?.key === 'name') return i ? 'Priya Patel' : 'Rahul Sharma'
      if (f?.key === 'phone') return i ? '9876500002' : '9876500001'
      if (f?.key === 'role') return i ? 'All-rounder' : 'Batsman'
      if (f?.key === 'age') return i ? 22 : 27
      if (f?.type === 'select') return f.options?.[0] ?? ''
      if (c === 'Category') return categories?.[Math.min(i, categories.length - 1)] ?? ''
      return ''
    })
  const ws = XLSX.utils.aoa_to_sheet([cols, sample(0), sample(1)])
  ws['!cols'] = cols.map((c) => ({ wch: Math.max(18, c.length + 6) }))
  const help = XLSX.utils.aoa_to_sheet([
    ['How to fill this sheet'],
    ['• One player per row. Only the name is required.'],
    ['• Role: Batsman, Bowler, All-rounder or Wicket-keeper (short forms like WK, AR, bat, bowl also work).'],
    ...(categories?.length ? [[`• Category: one of ${categories.join(', ')} — each category can have its own base price.`]] : []),
    ['• Photo URL: any public image link. Google Drive links are converted automatically.'],
    ['• Delete the two sample rows before uploading.'],
  ])
  help['!cols'] = [{ wch: 110 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Players')
  XLSX.utils.book_append_sheet(wb, help, 'Instructions')
  XLSX.writeFile(wb, `${safeName(tournamentName)}_player_template.xlsx`)
}

export async function exportPlayers(players: Player[], teams: Team[], tournament: Pick<Tournament, 'name' | 'useCategories'>) {
  const XLSX = await import('xlsx')
  const teamName = new Map(teams.map((t) => [t.id, t.name]))
  const extraKeys = [...new Set(players.flatMap((p) => Object.keys(p.extra ?? {})))]
  const rows = players.map((p) => ({
    '#': p.serial,
    Name: p.name,
    Role: p.role,
    ...(tournament.useCategories ? { Category: p.category ?? '' } : {}),
    Mobile: p.phone ?? '',
    Email: p.email ?? '',
    City: p.city ?? '',
    Age: p.age ?? '',
    'Batting style': p.battingStyle ?? '',
    'Bowling style': p.bowlingStyle ?? '',
    Status: p.status,
    Team: p.soldTeamId ? teamName.get(p.soldTeamId) ?? '' : '',
    'Sold price': p.soldPrice ?? '',
    Approved: p.approved ? 'Yes' : 'No',
    Source: p.source,
    'Photo URL': p.photoUrl ?? '',
    ...Object.fromEntries(extraKeys.map((k) => [k, p.extra?.[k] ?? ''])),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, rows), 'Players')
  XLSX.writeFile(wb, `${safeName(tournament.name)}_players.xlsx`)
}

export async function exportResults(players: Player[], teams: Team[], tournament: Pick<Tournament, 'name' | 'teamPurse' | 'useCategories'>) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const sold = players.filter((p) => p.status === 'SOLD')
  const summary = teams.map((t) => {
    const squad = sold.filter((p) => p.soldTeamId === t.id)
    const spent = squad.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
    const top = [...squad].sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))[0]
    return {
      Team: t.name,
      Owner: t.ownerName ?? '',
      Players: squad.length,
      Spent: spent,
      'Purse left': t.purse,
      'Most expensive': top ? `${top.name} (${top.soldPrice})` : '',
    }
  })
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, summary), 'Summary')
  for (const t of teams) {
    const rows = sold
      .filter((p) => p.soldTeamId === t.id)
      .sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))
      .map((p, i) => ({ '#': i + 1, Player: p.name, Role: p.role, Price: p.soldPrice, Mobile: p.phone ?? '', ...(tournament.useCategories ? { Category: p.category ?? '' } : {}) }))
    const sheetName = t.name.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || t.shortName
    XLSX.utils.book_append_sheet(wb, sheet(XLSX, rows.length ? rows : [{ Player: 'No players bought' }]), uniqueSheet(wb, sheetName))
  }
  const unsold = players.filter((p) => p.status !== 'SOLD').map((p) => ({ '#': p.serial, Player: p.name, Role: p.role, Status: p.status, Mobile: p.phone ?? '' }))
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, unsold.length ? unsold : [{ Player: 'Everyone was sold 🎉' }]), 'Unsold')
  XLSX.writeFile(wb, `${safeName(tournament.name)}_auction_results.xlsx`)
}

/**
 * Column widths from the content (Excel's default is ~8 characters, which cut off every name).
 * Each column is as wide as its longest value, within sensible bounds.
 */
function autoWidth(ws: Record<string, unknown>, rows: Record<string, unknown>[], min = 12, max = 60) {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  ws['!cols'] = keys.map((k) => {
    const longest = Math.max(k.length, ...rows.map((r) => String(r[k] ?? '').length))
    return { wch: Math.min(max, Math.max(min, longest + 3)) }
  })
  return ws
}

function sheet(XLSX: typeof import('xlsx'), rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows)
  autoWidth(ws as unknown as Record<string, unknown>, rows)
  return ws
}

function uniqueSheet(wb: { SheetNames: string[] }, name: string) {
  let n = name
  let i = 2
  while (wb.SheetNames.includes(n)) n = `${name.slice(0, 28)} ${i++}`
  return n
}

function safeName(s: string) {
  return s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'auction'
}
