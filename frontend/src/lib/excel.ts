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

/** Guess which player field each column holds. Works for most Google Forms / hand-made sheets. */
export function autoMap(headers: string[]): Record<string, TargetKey> {
  const scores: { header: string; key: Exclude<TargetKey, 'extra' | 'ignore'>; score: number }[] = []
  for (const h of headers) {
    const n = norm(h)
    for (const [key, syns] of Object.entries(SYNONYMS) as [Exclude<TargetKey, 'extra' | 'ignore'>, string[]][]) {
      let score = 0
      for (const s of syns) {
        if (n === s) score = Math.max(score, 100)
        else if (new RegExp(`\\b${s}\\b`).test(n)) score = Math.max(score, 50 + s.length)
      }
      if (score) scores.push({ header: h, key, score })
    }
  }
  scores.sort((a, b) => b.score - a.score)
  const map: Record<string, TargetKey> = {}
  const used = new Set<string>()
  for (const s of scores) {
    if (map[s.header] || used.has(s.key)) continue
    map[s.header] = s.key
    used.add(s.key)
  }
  for (const h of headers) if (!map[h]) map[h] = IGNORE.includes(norm(h)) ? 'ignore' : 'extra'
  return map
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

/** Template whose columns match the registration form, so offline and online lists merge cleanly. */
export async function downloadTemplate(fields: RegField[], tournamentName: string) {
  const XLSX = await import('xlsx')
  const cols = fields.filter((f) => f.enabled && f.type !== 'photo').map((f) => f.label)
  if (fields.some((f) => f.enabled && f.type === 'photo')) cols.push('Photo URL')
  cols.push('Category', 'Base Price')
  const sample = (i: number) =>
    cols.map((c) => {
      const f = fields.find((x) => x.label === c)
      if (f?.key === 'name') return i ? 'Priya Patel' : 'Rahul Sharma'
      if (f?.key === 'phone') return i ? '9876500002' : '9876500001'
      if (f?.key === 'role') return i ? 'All-rounder' : 'Batsman'
      if (f?.key === 'age') return i ? 22 : 27
      if (f?.type === 'select') return f.options?.[0] ?? ''
      if (c === 'Category') return i ? 'B' : 'A'
      return ''
    })
  const ws = XLSX.utils.aoa_to_sheet([cols, sample(0), sample(1)])
  ws['!cols'] = cols.map((c) => ({ wch: Math.max(14, c.length + 4) }))
  const help = XLSX.utils.aoa_to_sheet([
    ['How to fill this sheet'],
    ['• One player per row. Only the name is required.'],
    ['• Role: Batsman, Bowler, All-rounder or Wicket-keeper (short forms like WK, AR, bat, bowl also work).'],
    ['• Category (optional): A / B / C or any label — you can set a different base price per category.'],
    ['• Photo URL: any public image link. Google Drive links are converted automatically.'],
    ['• Delete the two sample rows before uploading.'],
  ])
  help['!cols'] = [{ wch: 110 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Players')
  XLSX.utils.book_append_sheet(wb, help, 'Instructions')
  XLSX.writeFile(wb, `${safeName(tournamentName)}_player_template.xlsx`)
}

export async function exportPlayers(players: Player[], teams: Team[], tournament: Pick<Tournament, 'name'>) {
  const XLSX = await import('xlsx')
  const teamName = new Map(teams.map((t) => [t.id, t.name]))
  const extraKeys = [...new Set(players.flatMap((p) => Object.keys(p.extra ?? {})))]
  const rows = players.map((p) => ({
    '#': p.serial,
    Name: p.name,
    Role: p.role,
    Category: p.category ?? '',
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Players')
  XLSX.writeFile(wb, `${safeName(tournament.name)}_players.xlsx`)
}

export async function exportResults(players: Player[], teams: Team[], tournament: Pick<Tournament, 'name' | 'teamPurse'>) {
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary')
  for (const t of teams) {
    const rows = sold
      .filter((p) => p.soldTeamId === t.id)
      .sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))
      .map((p, i) => ({ '#': i + 1, Player: p.name, Role: p.role, Price: p.soldPrice, Mobile: p.phone ?? '', Category: p.category ?? '' }))
    const sheetName = t.name.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || t.shortName
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Player: 'No players bought' }]), uniqueSheet(wb, sheetName))
  }
  const unsold = players.filter((p) => p.status !== 'SOLD').map((p) => ({ '#': p.serial, Player: p.name, Role: p.role, Status: p.status, Mobile: p.phone ?? '' }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unsold.length ? unsold : [{ Player: 'Everyone was sold 🎉' }]), 'Unsold')
  XLSX.writeFile(wb, `${safeName(tournament.name)}_auction_results.xlsx`)
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
