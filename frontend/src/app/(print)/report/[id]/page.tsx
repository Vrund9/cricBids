'use client'

import { use, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { money, roleMeta } from '@/lib/format'
import type { Player, Team, Tournament } from '@/lib/types'

interface Results {
  tournament: Tournament
  teams: Team[]
  players: Player[]
  bidCount: number
}

/**
 * Print-ready auction report. The browser's "Save as PDF" turns this HTML into the PDF, so the
 * design is real layout (A4 pages, team colours, photos) rather than a screenshot of the app.
 * `?team=<id>` limits it to one squad.
 */
export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [r, setR] = useState<Results | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const printed = useRef(false)

  useEffect(() => {
    setTeamId(new URLSearchParams(window.location.search).get('team'))
    api<Results>(`/tournaments/${id}/auction/results`).then(setR).catch((e) => setError((e as Error).message))
  }, [id])

  const sold = useMemo(() => (r?.players ?? []).filter((p) => p.status === 'SOLD'), [r])
  const teams = useMemo(() => (r ? (teamId ? r.teams.filter((t) => t.id === teamId) : r.teams) : []), [r, teamId])

  // Open the print dialog once everything (including photos) has had a moment to load.
  useEffect(() => {
    if (!r || printed.current) return
    printed.current = true
    document.title = `${r.tournament.name} — ${teamId ? teams[0]?.name ?? 'Team' : 'Auction'} report`
    const id = setTimeout(() => window.print(), 900)
    return () => clearTimeout(id)
  }, [r, teamId, teams])

  if (error) return <Shell><p className="msg">{error}. Open this report from the Results page while signed in.</p></Shell>
  if (!r) return <Shell><p className="msg">Preparing your report…</p></Shell>

  const t = r.tournament
  const cur = t.currency
  const total = sold.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
  const top = [...sold].sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0)).slice(0, 5)
  const unsold = r.players.filter((p) => p.status !== 'SOLD' && p.approved)
  const date = t.auctionDate ? new Date(t.auctionDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : null

  return (
    <Shell>
      <div className="toolbar">
        <span>Use <b>Save as PDF</b> as the destination in the print dialog.</span>
        <button onClick={() => window.print()}>Download PDF</button>
      </div>

      {!teamId && (
        <section className="page cover">
          <header className="hero">
            {t.logoUrl ? <img src={t.logoUrl} alt="" className="logo" /> : <div className="logo logo-fallback">{t.name.slice(0, 2).toUpperCase()}</div>}
            <div>
              <p className="eyebrow">Player auction report</p>
              <h1>{t.name}</h1>
              <p className="meta">{[date, t.venue].filter(Boolean).join(' · ')}</p>
            </div>
          </header>
          <div className="stats">
            <Stat label="Players sold" value={String(sold.length)} />
            <Stat label="Total spent" value={money(total, cur)} />
            <Stat label="Teams" value={String(r.teams.length)} />
            <Stat label="Bids placed" value={String(r.bidCount)} />
          </div>

          {top.length > 0 && (
            <>
              <h2 className="section">Top buys</h2>
              <ol className="top">
                {top.map((p, i) => {
                  const tm = r.teams.find((x) => x.id === p.soldTeamId)
                  return (
                    <li key={p.id} style={{ borderTopColor: tm?.color }}>
                      <span className="rank">#{i + 1}</span>
                      <Photo src={p.photoUrl} name={p.name} size={64} />
                      <b className="tname">{p.name}</b>
                      <span className="small" style={{ color: tm?.color && `color-mix(in oklab, ${tm.color} 58%, black)` }}>{tm?.name}</span>
                      <span className="price">{money(p.soldPrice, cur)}</span>
                    </li>
                  )
                })}
              </ol>
            </>
          )}

          <h2 className="section">Team summary</h2>
          <table className="tbl">
            <thead><tr><th>Team</th><th>Owner</th><th className="num">Players</th><th className="num">Spent</th><th className="num">Purse left</th></tr></thead>
            <tbody>
              {r.teams.map((tm) => {
                const squad = sold.filter((p) => p.soldTeamId === tm.id)
                return (
                  <tr key={tm.id}>
                    <td><span className="dot" style={{ background: tm.color }} />{tm.name}</td>
                    <td>{tm.ownerName || '—'}</td>
                    <td className="num">{squad.length}</td>
                    <td className="num">{money(squad.reduce((a, p) => a + (p.soldPrice ?? 0), 0), cur)}</td>
                    <td className="num">{money(tm.purse, cur)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {teams.map((tm) => {
        const squad = sold.filter((p) => p.soldTeamId === tm.id).sort((a, b) => (b.soldPrice ?? 0) - (a.soldPrice ?? 0))
        const spent = squad.reduce((a, p) => a + (p.soldPrice ?? 0), 0)
        return (
          <section key={tm.id} className="page team">
            <header className="teamhead" style={{ background: `linear-gradient(100deg, ${tm.color}, ${tm.color}cc)` }}>
              {tm.logoUrl ? <img src={tm.logoUrl} alt="" className="tlogo" /> : <div className="tlogo tlogo-fallback">{tm.shortName}</div>}
              <div>
                <p className="eyebrow light">{t.name}</p>
                <h2>{tm.name}</h2>
                <p className="meta light">{tm.ownerName ? `Owner: ${tm.ownerName} · ` : ''}{squad.length} players · spent {money(spent, cur)} · left {money(tm.purse, cur)}</p>
              </div>
            </header>
            {squad.length ? (
              <table className="tbl squad">
                <thead><tr><th>#</th><th>Player</th><th>Role</th><th>Category</th><th className="num">Price</th></tr></thead>
                <tbody>
                  {squad.map((p, i) => (
                    <tr key={p.id}>
                      <td className="muted">{i + 1}</td>
                      <td><div className="pl"><Photo src={p.photoUrl} name={p.name} size={30} /><span>{p.name}{p.retained && <em className="small"> · retained</em>}</span></div></td>
                      <td><span className="role" style={{ color: `color-mix(in oklab, ${roleMeta(p.role).color} 58%, black)`, borderColor: roleMeta(p.role).color }}>{p.role}</span></td>
                      <td>{p.category || '—'}</td>
                      <td className="num strong">{money(p.soldPrice, cur)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={4}>Total</td><td className="num strong">{money(spent, cur)}</td></tr></tfoot>
              </table>
            ) : (
              <p className="msg">No players bought.</p>
            )}
          </section>
        )
      })}

      {!teamId && unsold.length > 0 && (
        <section className="page">
          <h2 className="section">Unsold players ({unsold.length})</h2>
          <div className="chips">{unsold.map((p) => <span key={p.id}>{p.name}</span>)}</div>
        </section>
      )}
      <p className="foot">Generated by BidWicket · {new Date().toLocaleString()}</p>
    </Shell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="small">{label}</span>
      <b>{value}</b>
    </div>
  )
}

function Photo({ src, name, size }: { src?: string | null; name: string; size: number }) {
  const [broken, setBroken] = useState(false)
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return src && !broken ? (
    <img src={src} alt="" width={size} height={size} className="ph" style={{ width: size, height: size }} onError={() => setBroken(true)} />
  ) : (
    <span className="ph ph-fallback" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>
  )
}

/** Fixed light palette: the report must look the same whatever theme the app is in. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rpt">
      <style>{`
        @page { size: A4; margin: 12mm; }
        html, body { background: #e9edf3 !important; }
        .rpt { --ink: #0f172a; --mute: #64748b; --line: #e2e8f0; color: var(--ink); font-family: var(--font-geist), system-ui, sans-serif; padding: 24px 12px 40px; }
        .rpt * { border-color: var(--line); }
        .rpt .toolbar { max-width: 794px; margin: 0 auto 16px; display: flex; gap: 12px; align-items: center; justify-content: space-between; font-size: 13px; color: var(--mute); }
        .rpt .toolbar button { background: #15803d; color: #fff; font-weight: 700; border-radius: 10px; padding: 8px 16px; }
        .rpt .page { background: #fff; max-width: 794px; margin: 0 auto 18px; padding: 36px 40px; border-radius: 14px; box-shadow: 0 10px 30px -18px rgba(15,23,42,.35); }
        .rpt .hero { display: flex; gap: 20px; align-items: center; padding-bottom: 22px; border-bottom: 3px solid #15803d; }
        .rpt .logo { width: 84px; height: 84px; border-radius: 18px; object-fit: cover; flex-shrink: 0; }
        .rpt .logo-fallback, .rpt .tlogo-fallback { display: grid; place-items: center; background: #0f172a; color: #fff; font-weight: 800; font-size: 26px; }
        .rpt h1 { font-family: var(--font-bricolage), sans-serif; font-size: 34px; font-weight: 800; line-height: 1.05; letter-spacing: -.02em; }
        .rpt .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: #15803d; }
        .rpt .eyebrow.light, .rpt .meta.light { color: rgba(255,255,255,.88); }
        .rpt .meta { margin-top: 4px; font-size: 13px; color: var(--mute); }
        .rpt .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 22px 0 6px; }
        .rpt .stat { border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
        .rpt .stat b { font-size: 20px; font-family: var(--font-bricolage), sans-serif; }
        .rpt .small { font-size: 11px; color: var(--mute); }
        .rpt .section { margin: 26px 0 12px; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; }
        .rpt .top { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
        .rpt .top li { border: 1px solid var(--line); border-top-width: 4px; border-radius: 12px; padding: 12px 8px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative; }
        .rpt .top .rank { position: absolute; left: 8px; top: 6px; font-size: 11px; font-weight: 800; color: #cbd5e1; }
        .rpt .top .tname { font-size: 12px; line-height: 1.2; }
        .rpt .top .price { font-weight: 800; color: #b45309; font-size: 14px; }
        .rpt .tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .rpt .tbl th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--mute); padding: 8px 10px; border-bottom: 2px solid var(--line); }
        .rpt .tbl td { padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
        .rpt .tbl tbody tr:nth-child(even) td { background: #f8fafc; }
        .rpt .tbl tfoot td { font-weight: 800; border-bottom: 0; border-top: 2px solid var(--ink); }
        .rpt .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .rpt .strong { font-weight: 700; }
        .rpt .muted { color: var(--mute); }
        .rpt .dot { display: inline-block; width: 9px; height: 9px; border-radius: 99px; margin-right: 8px; vertical-align: middle; }
        .rpt .teamhead { display: flex; gap: 16px; align-items: center; color: #fff; border-radius: 14px; padding: 18px 20px; margin-bottom: 16px; }
        .rpt .teamhead h2 { font-family: var(--font-bricolage), sans-serif; font-size: 26px; font-weight: 800; line-height: 1.1; }
        .rpt .tlogo { width: 60px; height: 60px; border-radius: 14px; object-fit: cover; background: rgba(255,255,255,.2); flex-shrink: 0; }
        .rpt .pl { display: flex; align-items: center; gap: 10px; }
        .rpt .ph { border-radius: 10px; object-fit: cover; flex-shrink: 0; }
        .rpt .ph-fallback { display: inline-grid; place-items: center; background: #e2e8f0; color: #334155; font-weight: 700; }
        .rpt .role { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; border: 1px solid; border-radius: 99px; padding: 1px 8px; filter: brightness(.7) saturate(1.4); }
        .rpt .chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .rpt .chips span { border: 1px solid var(--line); border-radius: 99px; padding: 3px 10px; font-size: 12px; }
        .rpt .msg { max-width: 794px; margin: 40px auto; text-align: center; color: var(--mute); }
        .rpt .foot { max-width: 794px; margin: 0 auto; text-align: center; font-size: 11px; color: var(--mute); }
        @media print {
          html, body { background: #fff !important; }
          .rpt { padding: 0; }
          .rpt .toolbar { display: none; }
          .rpt .page { box-shadow: none; border-radius: 0; padding: 0; margin: 0; max-width: none; }
          .rpt .page + .page { break-before: page; }
          .rpt .tbl tr, .rpt .top li { break-inside: avoid; }
          .rpt * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      {children}
    </div>
  )
}
