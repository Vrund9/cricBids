import { ImageResponse } from 'next/og'
import type { CSSProperties, ReactNode } from 'react'
import { LOGO_DATA_URI } from '@/lib/brand-mark'
import { API_URL, SITE_URL, serverGet } from '@/lib/api'
import { moneyShort, roleMeta } from '@/lib/format'
import { palette, type ThemeConfig } from '@/lib/themes'

// Shareable result posters (PNG): `?team=<id>` draws that team's squad, no team draws the top buys.
// Built from the public live-link data, so anyone with the live link can open or forward them.

interface Meta {
  name: string
  logoUrl?: string | null
  venue?: string | null
  currency: string
  teams: number
  players: number
  sold: number
  totalSpent: number
  theme?: ThemeConfig
  /** False when the organiser turned prices off for these images */
  posterPrices?: boolean
}

interface PosterPlayer {
  id: string
  name: string
  role: string
  photoUrl: string | null
  soldPrice: number | null
  soldTeamId: string | null
  retained: boolean
}

interface PosterTeam {
  id: string
  name: string
  shortName: string
  color: string
  logoUrl: string | null
  purse: number
  ownerName: string | null
  players: PosterPlayer[]
}

// Instagram's tallest feed post (4:5); also fits WhatsApp and Facebook without cropping.
const W = 1080
const H = 1350
const PAD = 60
const INNER = W - PAD * 2
const MUTED = '#8a94ad'
const LINE = '1px solid rgba(255,255,255,0.12)'
const DISPLAY = 'Bricolage Grotesque'
const ellipsis: CSSProperties = { display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const url = new URL(req.url)
  const [meta, squads] = await Promise.all([
    serverGet<Meta>(`/public/live/${token}/meta`, 0),
    serverGet<{ teams: PosterTeam[] }>(`/public/live/${token}/squads`, 0),
  ])
  if (!meta || !squads) return new Response('This live link is invalid or has been reset', { status: 404 })

  const teamId = url.searchParams.get('team')
  const team = teamId ? squads.teams.find((t) => t.id === teamId) : null
  if (teamId && !team) return new Response('Team not found', { status: 404 })

  const [image, fonts] = await Promise.all([team ? teamPoster(meta, team) : topBuysPoster(meta, squads.teams), loadFonts()])
  const name = `${slug(meta.name)}-${team ? slug(team.name) : 'top-buys'}.png`
  return new ImageResponse(image, {
    width: W,
    height: H,
    fonts,
    headers: {
      // Results can still change (re-auction, corrections), so never let a stale poster stick around.
      'cache-control': 'public, max-age=60',
      'content-disposition': `${url.searchParams.has('download') ? 'attachment' : 'inline'}; filename="${name}"`,
    },
  })
}

// ── Team squad ──

async function teamPoster(m: Meta, team: PosterTeam) {
  const p = palette(m.theme)
  const squad = [...team.players].sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))
  const prices = m.posterPrices !== false
  const { cols, cw, photoH, infoH, gap } = squadGrid(squad.length, H - 132 - 168 - 64 - footerHeight(m), prices)
  const nameSize = clamp(cw * 0.105, 13, 26)
  const priceSize = clamp(cw * 0.135, 16, 32)
  const badge: CSSProperties = { display: 'flex', alignItems: 'center', position: 'absolute', fontSize: clamp(cw * 0.07, 11, 16), fontWeight: 800, borderRadius: 999, padding: cw < 160 ? '2px 7px' : '4px 12px' }
  const inset = cw < 160 ? 6 : 12

  const [tLogo, logo, photos] = await Promise.all([
    loadImage(m.logoUrl, 128),
    loadImage(team.logoUrl, 264),
    Promise.all(squad.map((x) => loadImage(x.photoUrl, cw * 2))),
  ])

  return (
    <Frame m={m} background={`radial-gradient(1100px 620px at 85% -8%, ${team.color}66, transparent 62%), radial-gradient(800px 500px at -10% 100%, ${p.accent}1f, transparent 60%), ${p.ink[1]}`}>
      <Header m={m} logo={tLogo} label="OFFICIAL SQUAD" accent={p.accent} />
      <div style={{ display: 'flex', flexDirection: 'column', padding: `36px ${PAD}px 0` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          <Picture src={logo} name={team.shortName} size={132} radius={32} color={team.color} border={`4px solid ${team.color}`} />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <div style={{ ...ellipsis, fontSize: team.name.length > 22 ? 52 : 66, fontWeight: 800, fontFamily: DISPLAY, lineHeight: 1.1, letterSpacing: -1 }}>{team.name}</div>
            {team.ownerName && <div style={{ ...ellipsis, fontSize: 26, color: '#b8c0d4', marginTop: 6 }}>{`Owner · ${team.ownerName}`}</div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, flexWrap: 'wrap', alignContent: 'center', justifyContent: cols > squad.length ? 'center' : 'flex-start', gap, padding: `32px ${PAD}px` }}>
        {squad.map((x, i) => {
          const role = roleMeta(x.role)
          return (
            <div key={x.id} style={{ display: 'flex', flexDirection: 'column', width: cw, height: photoH + infoH, borderRadius: cw < 160 ? 16 : 24, overflow: 'hidden', border: i === 0 ? `2px solid ${p.gold}` : LINE, background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', position: 'relative', width: cw, height: photoH }}>
                <Picture src={photos[i]} name={x.name} size={cw} height={photoH} radius={0} color={team.color} />
                <div style={{ ...badge, left: inset, top: inset, color: '#05070c', background: role.color }}>{role.short}</div>
                {i === 0 && <div style={{ ...badge, right: inset, top: inset, color: '#05070c', background: p.gold }}>
                  <Star />{cw < 200 ? 'TOP' : 'TOP BUY'}
                </div>}
                {x.retained && <div style={{ ...badge, right: inset, bottom: inset, color: 'white', background: 'rgba(0,0,0,0.6)' }}>RETAINED</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, padding: `0 ${cw < 160 ? 8 : 16}px` }}>
                <div style={{ ...ellipsis, fontSize: nameSize, fontWeight: 700 }}>{x.name}</div>
                {prices && <div style={{ display: 'flex', fontSize: priceSize, fontWeight: 800, color: p.gold }}>{moneyShort(x.soldPrice, m.currency)}</div>}
              </div>
            </div>
          )
        })}
        {!squad.length && (
          <div style={{ display: 'flex', width: INNER, height: 300, alignItems: 'center', justifyContent: 'center', borderRadius: 24, border: LINE, fontSize: 30, color: MUTED }}>No players bought</div>
        )}
      </div>
    </Frame>
  )
}

const clamp = (n: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, n)))

/** Biggest player cards (3–8 per row) that still fit the whole squad in the fixed poster height. */
function squadGrid(n: number, height: number, prices: boolean) {
  const gap = 16
  let best: { cols: number; cw: number; photoH: number; infoH: number; gap: number } | null = null
  for (let cols = 3; cols <= 8; cols++) {
    const cw = Math.floor((INNER - gap * (cols - 1)) / cols)
    const infoH = prices ? clamp(cw * 0.4, 56, 96) : clamp(cw * 0.25, 40, 60)
    const photoH = Math.round(cw * 1.08)
    const rows = Math.max(1, Math.ceil(n / cols))
    if (rows * (photoH + infoH) + (rows - 1) * gap <= height) return { cols, cw, photoH, infoH, gap }
    best = { cols, cw, photoH, infoH, gap }
  }
  // Very large squads: keep 8 per row and shorten the photos until every row fits.
  const b = best!
  const rows = Math.ceil(n / b.cols)
  return { ...b, photoH: Math.floor((height - (rows - 1) * gap) / rows) - b.infoH }
}

// ── Top buys (one poster for the whole auction) ──

async function topBuysPoster(m: Meta, teams: PosterTeam[]) {
  const p = palette(m.theme)
  const teamOf = new Map(teams.map((t) => [t.id, t]))
  const sold = teams.flatMap((t) => t.players).filter((x) => x.soldPrice != null).sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))
  // #1 large, then #2–#9 in two columns: as many as fit a 4:5 post.
  const [hero, ...rest] = sold.slice(0, 9)

  const [tLogo, heroPhoto, heroLogo, restPhotos] = await Promise.all([
    loadImage(m.logoUrl, 128),
    hero ? loadImage(hero.photoUrl, 600) : null,
    hero ? loadImage(teamOf.get(hero.soldTeamId ?? '')?.logoUrl, 80) : null,
    Promise.all(rest.map((x) => loadImage(x.photoUrl, 136))),
  ])

  const HERO = 330
  const ROW = 86
  const heroTeam = hero ? teamOf.get(hero.soldTeamId ?? '') : undefined
  const prices = m.posterPrices !== false
  const stats: [string, string][] = [
    [String(m.sold), 'Players sold'],
    ...(prices ? [[moneyShort(m.totalSpent, m.currency), 'Total spent'] as [string, string]] : []),
    [String(m.teams), 'Teams'],
  ]

  return (
    <Frame m={m} background={`radial-gradient(1000px 600px at 90% -5%, ${p.gold}38, transparent 60%), radial-gradient(900px 600px at -10% 45%, ${p.accent}24, transparent 60%), ${p.ink[1]}`}>
      <Header m={m} logo={tLogo} label="AUCTION RESULTS" accent={p.accent} />
      <div style={{ display: 'flex', flexDirection: 'column', padding: `24px ${PAD}px 0` }}>
        <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, fontFamily: DISPLAY, letterSpacing: -3, lineHeight: 1 }}>
          TOP <span style={{ color: p.gold, marginLeft: 20 }}>BUYS</span>
        </div>
        <div style={{ display: 'flex', fontSize: 22, color: MUTED, marginTop: 6 }}>The biggest bids of the auction</div>
      </div>

      {hero && (
        <div style={{ display: 'flex', margin: `24px ${PAD}px 0`, height: HERO, borderRadius: 28, overflow: 'hidden', border: `2px solid ${p.gold}`, background: `linear-gradient(110deg, ${heroTeam?.color ?? p.accent}40, rgba(255,255,255,0.03) 70%)` }}>
          <Picture src={heroPhoto} name={hero.name} size={300} height={HERO} radius={0} color={heroTeam?.color} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0, padding: '0 40px' }}>
            <div style={{ display: 'flex', alignSelf: 'flex-start', fontSize: 18, fontWeight: 800, color: '#05070c', background: p.gold, borderRadius: 999, padding: '5px 14px', letterSpacing: 2, alignItems: 'center' }}><Star />#1 MOST EXPENSIVE</div>
            <div style={{ ...ellipsis, fontSize: hero.name.length > 16 ? 44 : 54, fontWeight: 800, fontFamily: DISPLAY, lineHeight: 1.1, marginTop: 16 }}>{hero.name}</div>
            <div style={{ display: 'flex', fontSize: 20, color: MUTED, marginTop: 2 }}>{hero.role}</div>
            {heroTeam && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
                <Picture src={heroLogo} name={heroTeam.shortName} size={40} radius={11} color={heroTeam.color} />
                <div style={{ ...ellipsis, fontSize: 26, fontWeight: 700, maxWidth: 440 }}>{heroTeam.name}</div>
              </div>
            )}
            {prices && <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, fontFamily: DISPLAY, color: p.gold, marginTop: 8, letterSpacing: -2 }}>{moneyShort(hero.soldPrice, m.currency)}</div>}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, padding: `22px ${PAD}px 0` }}>
        {stats.map(([v, l]) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '12px 22px', borderRadius: 20, border: LINE, background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 34, fontWeight: 800, fontFamily: DISPLAY }}>{v}</div>
            <div style={{ fontSize: 17, color: MUTED, letterSpacing: 2 }}>{l.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: `22px ${PAD}px 24px` }}>
        {rest.map((x, i) => {
          const tm = teamOf.get(x.soldTeamId ?? '')
          return (
            <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 16, width: (INNER - 12) / 2, height: ROW, padding: '0 18px 0 10px', borderRadius: 20, border: LINE, background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', width: 44, justifyContent: 'center', fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.35)' }}>{`#${i + 2}`}</div>
              <Picture src={restPhotos[i]} name={x.name} size={66} radius={16} color={tm?.color} />
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <div style={{ ...ellipsis, fontSize: 22, fontWeight: 700 }}>{x.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 999, background: tm?.color ?? MUTED }} />
                  <div style={{ ...ellipsis, fontSize: 18, color: MUTED, maxWidth: 210 }}>{tm?.name ?? ''}</div>
                </div>
              </div>
              {prices && <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, color: p.gold }}>{moneyShort(x.soldPrice, m.currency)}</div>}
            </div>
          )
        })}
      </div>
    </Frame>
  )
}

// ── Shared pieces ──

function Frame({ m, background, children }: { m: Meta; background: string; children: ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Geist', background }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>{children}</div>
      <Footer m={m} />
    </div>
  )
}

function Header({ m, logo, label, accent }: { m: Meta; logo: string | null; label: string; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: `48px ${PAD}px 0` }}>
      <Picture src={logo} name={m.name} size={84} radius={22} color={accent} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', fontSize: 20, fontWeight: 800, letterSpacing: 5, color: accent }}>{label}</div>
        <div style={{ ...ellipsis, fontSize: 36, fontWeight: 800, marginTop: 2 }}>{m.name}</div>
      </div>
      {m.venue && <div style={{ ...ellipsis, fontSize: 22, color: MUTED, maxWidth: 300 }}>{m.venue}</div>}
    </div>
  )
}

const footerHeight = (m: Meta) => (m.theme?.hideBranding ? 0 : 130)

/** BidWicket call-to-action — every shared poster doubles as an ad. Hidden for tournaments that paid to remove branding. */
function Footer({ m }: { m: Meta }) {
  if (m.theme?.hideBranding) return null
  const accent = palette(m.theme).accent
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: footerHeight(m), padding: `0 ${PAD}px`, borderTop: LINE, background: 'rgba(0,0,0,0.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} width={56} height={56} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, fontFamily: DISPLAY }}>
            Bid<span style={{ color: accent }}>Wicket</span>
          </div>
          <div style={{ display: 'flex', fontSize: 19, color: MUTED }}>Live cricket player auctions</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', fontSize: 21, color: '#b8c0d4' }}>Run your own auction free at</div>
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 800, color: accent }}>{new URL(SITE_URL).host.replace(/^www\./, '')}</div>
      </div>
    </div>
  )
}

/** Photo or logo, falling back to initials on a colour block when the image is missing or unreadable. */
function Picture({ src, name, size, height = size, radius, color = '#34405a', border }: { src: string | null; name: string; size: number; height?: number; radius: number; color?: string; border?: string }) {
  // The renderer crashes on an undefined shorthand like `border`, so only set it when given.
  const box: CSSProperties = { display: 'flex', width: size, height, borderRadius: radius, overflow: 'hidden', flexShrink: 0, ...(border && { border }) }
  if (src) {
    return (
      <div style={box}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={size} height={height} alt="" style={{ width: size, height, objectFit: 'cover', objectPosition: 'center top' }} />
      </div>
    )
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
  return (
    <div style={{ ...box, alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${color}, ${color}66)`, fontSize: Math.round(Math.min(size, height) * 0.36), fontWeight: 800, color: 'white' }}>
      {initials}
    </div>
  )
}

/**
 * Fetches an image as a data URI the renderer can draw. Returns null for dead links and formats it
 * can't read (e.g. WebP), so one bad photo shows initials instead of breaking the whole poster.
 */
async function loadImage(url: string | null | undefined, px: number): Promise<string | null> {
  if (!url) return null
  let src = url.startsWith('/') ? `${API_URL}${url}` : url
  // Cloudinary: ask for a face-centred JPEG at roughly the drawn size (smaller, and never WebP).
  if (src.includes('res.cloudinary.com') && src.includes('/image/upload/')) {
    src = src.replace('/image/upload/', `/image/upload/c_fill,g_face,w_${px},h_${Math.round(px * 1.08)},f_jpg,q_auto/`)
  }
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } })
    if (!res.ok) return null
    const type = res.headers.get('content-type')?.split(';')[0].trim() ?? ''
    if (!/^image\/(jpeg|png|gif|svg\+xml)$/.test(type)) return null
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
  } catch {
    return null
  }
}

function Star() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
      <path fill="#05070c" d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18.3 5.5 22l1.7-7.4-5.7-5 7.5-.7z" />
    </svg>
  )
}

type Font = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: 'normal' }
let fontCache: Promise<Font[]> | undefined

/** The site's own typefaces (Bricolage Grotesque headings, Geist text), fetched once per server. Falls back to the default font. */
function loadFonts() {
  fontCache ??= Promise.all(
    ([['Bricolage Grotesque', 800], ['Geist', 400], ['Geist', 700]] as const).map(async ([name, weight]) => {
      // Without a browser user agent Google Fonts serves TTF, which the renderer can read (it can't read WOFF2).
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:wght@${weight}`)).text()
      const url = css.match(/src: url\((.+?)\)/)?.[1]
      if (!url) throw new Error(`No font file for ${name}`)
      return { name, weight, style: 'normal' as const, data: await (await fetch(url)).arrayBuffer() }
    }),
  ).catch(() => {
    fontCache = undefined
    return []
  })
  return fontCache
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'poster'
