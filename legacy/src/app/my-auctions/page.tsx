"use client"
import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../convex/_generated/api'
import { useQuery, useMutation } from 'convex/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface AuctionSession {
  _id: string
  seriesName?: string
  seriesLogo?: string
  teamCount?: number
  started?: boolean
  completed?: boolean
  lastUpdated: number
  players?: any[]
  teams?: any[]
  unifiedBasePrice?: number
  initialPrize?: number
}

interface AuctionArchive {
  _id: string
  seriesName: string
  teamCount: number
  totalSpent: number
  createdAt: number
  players: any[]
  teams: any[]
}

function useLocalUser(){
  const [userId,setUserId] = useState<string | null>(null)
  useEffect(()=>{
    if(typeof window !== 'undefined'){
      const raw = localStorage.getItem('ca_user')
      if(raw){ try { const parsed = JSON.parse(raw); setUserId(parsed.userId || parsed.id) } catch{} }
    }
  },[])
  return userId
}

export default function MyAuctionsPage(){
  const userId = useLocalUser()
  // Fixed: always pass the function ref; make args undefined until userId resolved
  const active = useQuery(api.auctionSession.listActiveSessions, userId ? { userId } as any : undefined) as AuctionSession[] | undefined
  const archived = useQuery(api.auctionSession.listArchivedAuctions, userId ? { userId } as any : undefined) as AuctionArchive[] | undefined
  const archiveMutation = useMutation(api.auctionSession.archiveAuction)
  const [tab,setTab] = useState<'current'|'past'>('current')
  const [archiving, setArchiving] = useState<string | null>(null)

  const loadingActive = userId && active === undefined && tab==='current'
  const loadingArchived = userId && archived === undefined && tab==='past'

  const handleArchive = async (s: AuctionSession) => {
    if(!userId || archiving) return
    if(!s.players?.length || !s.teams?.length) return
    setArchiving(s._id)
    try {
      await archiveMutation({
        userId: userId as any,
        seriesName: s.seriesName || 'Untitled Series',
        seriesLogo: s.seriesLogo,
        teamCount: s.teamCount || s.teams.length,
        unifiedBasePrice: s.unifiedBasePrice,
        initialPrize: s.initialPrize || 0,
        teams: s.teams as any,
        players: s.players as any
      })
      // After archive the listActiveSessions query will refetch automatically
    } finally {
      setArchiving(null)
    }
  }

  const totalStats = useMemo(()=>{
    if(!archived?.length) return null
    const totalSpentAll = archived.reduce((a,r)=> a + (r.totalSpent||0), 0)
    const totalPlayersSold = archived.reduce((a,r)=> a + r.players.filter(p=>p.status==='sold').length, 0)
    return { totalSpentAll, totalPlayersSold }
  }, [archived])

  if(userId === null){
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold tracking-tight">My Auctions</h1>
        <div className="inline-flex rounded-full border bg-background p-1" role="tablist" aria-label="Auction views">
          <Button
            role="tab"
            aria-selected={tab==='current'}
            variant="ghost"
            size="sm"
            className={'rounded-full px-5 text-xs font-medium transition-colors ' + (tab==='current' ? 'bg-accent text-accent-foreground shadow-sm' : 'hover:bg-muted')}
            onClick={()=>setTab('current')}
          >Current</Button>
          <Button
            role="tab"
            aria-selected={tab==='past'}
            variant="ghost"
            size="sm"
            className={'rounded-full px-5 text-xs font-medium transition-colors ' + (tab==='past' ? 'bg-accent text-accent-foreground shadow-sm' : 'hover:bg-muted')}
            onClick={()=>setTab('past')}
          >Past</Button>
        </div>
      </div>

      {!userId && (
        <p className="text-sm text-muted-foreground">Login to view your auctions.</p>
      )}

      {userId && tab==='current' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingActive && (
            <div className="col-span-full text-sm text-muted-foreground">Loading active auctions...</div>
          )}
          {!loadingActive && (!active || !active.length) && (
            <div className="col-span-full text-sm text-muted-foreground border rounded-md p-6 text-center">No active auctions yet.</div>
          )}
          {active?.map(s => {
            const soldPlayers = s.players?.filter(p=>p.status==='sold') || []
            const totalSpent = soldPlayers.reduce((a,p)=> a + (p.soldPrice||0), 0)
            const totalPlayers = s.players?.length || 0
            return (
              <Card key={s._id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm truncate" title={s.seriesName || 'Untitled Series'}>{s.seriesName || 'Untitled Series'}</h3>
                  {s.started && !s.completed && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400">Live</span>}
                  {s.completed && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">Completed</span>}
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span>Teams: <span className="text-foreground">{s.teamCount || s.teams?.length || 0}</span></span>
                  <span>Players: <span className="text-foreground">{totalPlayers}</span></span>
                  <span>Sold: <span className="text-foreground">{soldPlayers.length}</span></span>
                  <span>Spent: <span className="text-foreground">₹{totalSpent.toLocaleString()}</span></span>
                </div>
                <p className="text-[11px] text-muted-foreground">Updated {new Date(s.lastUpdated).toLocaleString()}</p>
                <div className="flex gap-2 pt-2 flex-wrap">
                  <Link href="/auction-live" className="text-xs underline">{s.started ? 'Resume' : 'Open'}</Link>
                  {!s.completed && s.started && (
                    <button
                      onClick={()=>handleArchive(s)}
                      disabled={archiving===s._id}
                      className="text-xs underline text-muted-foreground disabled:opacity-50"
                    >{archiving===s._id ? 'Archiving...' : 'Archive Now'}</button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {userId && tab==='past' && (
        <div className="space-y-6">
          {loadingArchived && <div className="text-sm text-muted-foreground">Loading archives...</div>}
          {!loadingArchived && (!archived || !archived.length) && (
            <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">No archived auctions yet.</div>
          )}
          {totalStats && archived?.length ? (
            <div className="flex flex-wrap gap-4 text-[11px] bg-muted/40 border rounded-md p-3">
              <span>Total Archived: <strong>{archived.length}</strong></span>
              <span>Players Sold: <strong>{totalStats.totalPlayersSold}</strong></span>
              <span>Total Spent: <strong>₹{totalStats.totalSpentAll.toLocaleString()}</strong></span>
            </div>
          ) : null}
          {archived?.length ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archived.map(a => (
                <Card key={a._id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm truncate" title={a.seriesName}>{a.seriesName}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">Archive</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span>Teams: <span className="text-foreground">{a.teamCount}</span></span>
                    <span>Players: <span className="text-foreground">{a.players.length}</span></span>
                    <span>Sold: <span className="text-foreground">{a.players.filter(p=>p.status==='sold').length}</span></span>
                    <span>Spent: <span className="text-foreground">₹{a.totalSpent.toLocaleString()}</span></span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Finished {new Date(a.createdAt).toLocaleDateString()}</p>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-foreground/80">Teams & Players</summary>
                    <div className="mt-2 space-y-2 max-h-44 overflow-auto pr-1">
                      <div>
                        <p className="font-medium">Teams</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          {a.teams.map(t => <li key={t.id}>{t.name} – Budget ₹{t.budget}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium mt-2">Players (sold)</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          {a.players.filter(p=>p.status==='sold').map(p => <li key={p.id}>{p.name} → Team {p.soldToTeamId} for ₹{p.soldPrice?.toLocaleString()}</li>)}
                        </ul>
                      </div>
                    </div>
                  </details>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
