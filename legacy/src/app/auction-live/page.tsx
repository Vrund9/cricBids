'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Check, SkipForward, Play, Users, Gavel, Share2, Link as LinkIcon, BarChart2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Player { id: number; name: string; specialization: string; photo?: string; status?: 'pending' | 'current' | 'sold' | 'unsold'; soldToTeamId?: number; soldPrice?: number; age?: number }
interface Team { id: number; name: string; budget: number; owner?: string; logo?: string }
interface Setup { seriesName: string; seriesLogo?: string; teamCount: number; teams: Team[]; players: Player[]; unifiedBasePrice?: number; minPlayersPerTeam?: number; initialPrize: number }
interface TeamStat { team: Team; spent: number; remaining: number; bought: number; counts: Record<string, number>; mostExp?: Player }

export default function AuctionLive() {
  const [setup, setSetup] = useState<Setup|null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(-1)
  const [currentBid, setCurrentBid] = useState<number>(0)
  const [started, setStarted] = useState(false)
  const [highestBidTeamId, setHighestBidTeamId] = useState<number|null>(null)
  const [popup, setPopup] = useState<{ type: 'sold' | 'unsold'; player: string; team?: string; price?: number; photo?: string; specialization?: string; teamLogo?: string; color?: string }|null>(null)
  const [reauctionDone, setReauctionDone] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [bidStep, setBidStep] = useState(100)
  const [recentBids, setRecentBids] = useState<{teamId:number; amount:number; time:number; playerId:number}[]>([])
  const [userId, setUserId] = useState<string|undefined>(undefined)
  const [rosterOpen, setRosterOpen] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [roleFilter, setRoleFilter] = useState<'All' | 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper'>('All')
  const [shareInfo, setShareInfo] = useState<{url:string; expiresAt:number}|null>(null)
  const hydratedRef = useRef(false)
  const upsert = useMutation((api as any).auctionSession.upsertProgress)
  const clearSession = useMutation((api as any).auctionSession.clearSession)
  const archiveAuction = useMutation((api as any).auctionSession.archiveAuction)
  const remoteSession = useQuery((api as any).auctionSession.getLatestForUser, userId ? { userId } : undefined)
  const generateShare = useMutation((api as any).auctionSession.generateShareLink)
  const makeShare = async () => {
    if(!userId) return
    try {
      const res = await generateShare({ userId } as any)
      const url = `${window.location.origin}/live/${res.token}`
      setShareInfo({ url, expiresAt: res.expiresAt })
    } catch(e){ console.warn('share failed', e) }
  }
  const playersRef = useRef<Player[]>([])
  useEffect(()=> { playersRef.current = players }, [players])

  useEffect(()=> {
    try {
      const rawUser = localStorage.getItem('ca_user')
      if(rawUser){
        const parsed = JSON.parse(rawUser)
        if(parsed?.id) setUserId(parsed.id)
      }
    } catch(err) { console.warn('Load user failed', err) }
  }, [])

  useEffect(()=> {
    if(!remoteSession || hydratedRef.current) return
    const rs: any = remoteSession
    if(rs.started || rs.players?.length){
      setSetup(prev => {
        if(prev) return prev
        if(!rs.seriesName) return null
        return {
          seriesName: rs.seriesName,
          seriesLogo: rs.seriesLogo,
          teamCount: rs.teamCount ?? 0,
          teams: rs.teams || [],
          players: rs.players || [],
          unifiedBasePrice: rs.unifiedBasePrice,
          minPlayersPerTeam: rs.minPlayersPerTeam,
          initialPrize: rs.initialPrize || 0
        }
      })
      if(rs.teams) setTeams(rs.teams)
      if(rs.players) setPlayers(rs.players)
      if(typeof rs.currentIndex==='number') setCurrentIndex(rs.currentIndex)
      if(typeof rs.currentBid==='number') setCurrentBid(rs.currentBid)
      if(typeof rs.highestBidTeamId==='number') setHighestBidTeamId(rs.highestBidTeamId)
      if(typeof rs.bidStep==='number') setBidStep(rs.bidStep)
      if(Array.isArray(rs.recentBids)) setRecentBids(rs.recentBids)
      if(typeof rs.reauctionDone==='boolean') setReauctionDone(rs.reauctionDone)
      if(typeof rs.started==='boolean') setStarted(rs.started)
    }
    hydratedRef.current = true
  }, [remoteSession])

  // debounce save auction progress when started or bidding state changes
  const saveTimerRef = useRef<NodeJS.Timeout|null>(null)
  useEffect(()=> {
    if(!userId) return
    if(saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(()=> {
      try {
        upsert({
          userId,
          step: 6,
          seriesName: setup?.seriesName,
          seriesLogo: setup?.seriesLogo,
          teamCount: setup?.teamCount,
          unifiedBasePrice: setup?.unifiedBasePrice,
          minPlayersPerTeam: setup?.minPlayersPerTeam,
          initialPrize: setup?.initialPrize,
          teams: teams.map(t=> ({ id: t.id, name: t.name, budget: t.budget, owner: t.owner, logo: t.logo })),
          players: players.map(p=> ({ id: p.id, name: p.name, specialization: p.specialization, photo: p.photo, status: p.status, soldToTeamId: p.soldToTeamId, soldPrice: p.soldPrice })),
          currentIndex,
          currentBid,
          highestBidTeamId: highestBidTeamId ?? undefined,
          bidStep,
          started,
          reauctionDone,
          recentBids,
        } as any)
      } catch(err) { console.warn('Save failed', err) }
    }, 600)
    return ()=> { if(saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [userId, teams, players, currentIndex, currentBid, highestBidTeamId, bidStep, started, reauctionDone, recentBids, setup])

  const startAuction = () => {
    if(!players.length) return
    setStarted(true)
    const randIndex = Math.floor(Math.random() * players.length)
    setCurrentIndex(randIndex)
    setPlayers(p=> p.map((pl,i)=> ({...pl, status: i===randIndex ? 'current' : 'pending'})))
    setCurrentBid(setup?.unifiedBasePrice||0)
    setHighestBidTeamId(null)
    // no need to clear bid history globally; history retained per player
  }

  const advancePlayer = () => {
    const list = playersRef.current
    const pendingIndices = list.map((pl,i)=> pl.status==='pending' ? i : -1).filter(i=> i>=0)
    if(pendingIndices.length===0){
      setCurrentIndex(-1)
      return
    }
    const choice = pendingIndices[Math.floor(Math.random()*pendingIndices.length)]
    setPlayers(prev => prev.map((pl,i)=> {
      if(pl.status==='current' && i!==choice) {
        if(pl.status==='current') return { ...pl, status: 'pending' }
      }
      if(i===choice) return { ...pl, status: 'current' }
      return pl
    }))
    setCurrentIndex(choice)
    setCurrentBid(setup?.unifiedBasePrice||0)
    setHighestBidTeamId(null)
    // do not clear recentBids; we filter per player
  }

  const basePrice = setup?.unifiedBasePrice || 0

  const placeBid = (teamId:number) => {
    if(currentIndex < 0) return
    const pl = playersRef.current[currentIndex]
    if(!pl || pl.status==='sold' || pl.status==='unsold') return
    setCurrentBid(prevBid => {
      const existingHighest = highestBidTeamId
      const firstBid = existingHighest == null
      const starting = prevBid < basePrice ? basePrice : prevBid
      let nextBid = starting
      if(firstBid || teamId !== existingHighest) {
        nextBid = starting + bidStep
      }
      const teamBudget = teams.find(t=> t.id===teamId)?.budget || 0
      if(teamBudget < nextBid) return prevBid
      if(firstBid || teamId !== existingHighest) {
        setRecentBids(list => {
          // Remove any previous entries with same (player, team, amount)
          const filtered = list.filter(b => !(b.playerId === pl.id && b.teamId === teamId && b.amount === nextBid))
          const newEntry = { teamId, amount: nextBid, time: Date.now(), playerId: pl.id }
          const updated = [newEntry, ...filtered]
          // keep only last 15 bids per player
          const counts: Record<number, number> = {}
          const pruned: typeof updated = []
          for (const entry of updated) {
            counts[entry.playerId] = (counts[entry.playerId] || 0) + 1
            if (counts[entry.playerId] <= 15) pruned.push(entry)
          }
          return pruned
        })
      }
      setHighestBidTeamId(teamId)
      return nextBid
    })
  }

  const sellPlayer = () => {
    const winningTeam = highestBidTeamId
    if(currentIndex<0 || winningTeam==null) return
    const plObj = playersRef.current[currentIndex]
    const playerName = plObj.name
    const teamName = getTeamName(winningTeam)
    const price = currentBid
    const t = teams.find(t=> t.id===winningTeam)
    const popupColor = getTeamColor(winningTeam)
    setPlayers(prev => prev.map((pl,i)=> i===currentIndex ? ({...pl, status: 'sold', soldToTeamId: winningTeam, soldPrice: price }) : pl))
    setTeams(prev => prev.map(t=> t.id===winningTeam ? ({...t, budget: t.budget - price}) : t))
    setPopup({ type: 'sold', player: playerName, team: teamName, price, photo: plObj.photo, specialization: plObj.specialization, teamLogo: t?.logo, color: popupColor })
    setTimeout(()=> { setPopup(null); advancePlayer() }, 2000)
  }

  const markUnsoldWithPopup = () => {
    if(currentIndex<0) return
    const plObj = playersRef.current[currentIndex]
    const playerName = plObj.name
    setPlayers(prev => prev.map((pl,i)=> i===currentIndex ? ({...pl, status: 'unsold'}) : pl))
    setPopup({ type: 'unsold', player: playerName, photo: plObj.photo, specialization: plObj.specialization })
    setTimeout(()=> { setPopup(null); advancePlayer() }, 1600)
  }

  const getTeamName = (id?:number|null) => teams.find(t=> t.id===id)?.name || ''

  const exportResults = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const soldRows = players.filter(p=> p.status==='sold').map(p=> ({
      Player: p.name,
      Specialization: p.specialization,
      Team: getTeamName(p.soldToTeamId),
      Price: p.soldPrice||0
    }))
    const soldSheet = XLSX.utils.json_to_sheet(soldRows)
    XLSX.utils.book_append_sheet(wb, soldSheet, 'SoldPlayers')
    teams.forEach(team=> {
      const teamPlayers = players.filter(p=> p.soldToTeamId===team.id).map(p=> ({ Player: p.name, Price: p.soldPrice||0, Specialization: p.specialization }))
      const sheet = XLSX.utils.json_to_sheet(teamPlayers)
      XLSX.utils.book_append_sheet(wb, sheet, team.name.slice(0,31) || `Team${team.id}`)
    })
    const summaryRows = teams.map(t=> {
      const pts = players.filter(p=> p.soldToTeamId===t.id)
      const spent = pts.reduce((a,p)=> a + (p.soldPrice||0), 0)
      return { Team: t.name, PlayersBought: pts.length, Spent: spent, RemainingBudget: t.budget }
    })
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')
    XLSX.writeFile(wb, `${((setup as Setup).seriesName||'auction').replace(/[^a-z0-9]/gi,'_')}_results.xlsx`)
  }

  const current = currentIndex>=0 ? players[currentIndex] : null
  // bids only for current player (compute directly to avoid stale memo edge cases)
  const currentPlayerBids = current ? recentBids.filter(b=> b.playerId===current.id) : []
  const openingBidTime = currentPlayerBids.length ? Math.min(...currentPlayerBids.map(b=> b.time)) : null
  const auctionEnded = players.every(p=> p.status==='sold' || p.status==='unsold') && players.length>0
  const hasUnsold = players.some(p=> p.status==='unsold')
  const showReauctionPrompt = auctionEnded && hasUnsold && !reauctionDone
  const anyPhotos = players.some(p=> p.photo)
  const soldPlayers = players.filter(p=> p.status==='sold')
  const mostExpensiveOverall = useMemo(() => soldPlayers.reduce<(Player|undefined)>((max,p)=> (p.soldPrice||0) > (max?.soldPrice||0) ? p : max, undefined), [soldPlayers])
  const teamStats = useMemo<TeamStat[]>(() => teams.map(t=> {
    const tPlayers = soldPlayers.filter(p=> p.soldToTeamId===t.id)
    const spent = tPlayers.reduce((a,p)=> a + (p.soldPrice||0), 0)
    const counts: Record<string, number> = {
      Batsman: tPlayers.filter(p=> p.specialization==='Batsman').length,
      Bowler: tPlayers.filter(p=> p.specialization==='Bowler').length,
      'All-rounder': tPlayers.filter(p=> p.specialization==='All-rounder').length,
      'Wicket-keeper': tPlayers.filter(p=> p.specialization==='Wicket-keeper').length,
    }
    const mostExp = tPlayers.reduce<(Player|undefined)>((m,p)=> (p.soldPrice||0) > (m?.soldPrice||0) ? p : m, undefined)
    return { team: t, spent, remaining: t.budget, bought: tPlayers.length, counts, mostExp }
  }), [teams, soldPlayers])

  const TEAM_COLOR_PALETTE = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f472b6','#84cc16','#6366f1','#14b8a6','#f43f5e']
  const getTeamColor = (teamId?:number|null) => {
    if(!teamId) return '#3b82f6'
    const idx = (teamId-1) % TEAM_COLOR_PALETTE.length
    return TEAM_COLOR_PALETTE[idx]
  }

  // Roster filtered players (sold players for selected team + role filter)
  const rosterPlayers = useMemo(()=> {
    if(!selectedTeamId) return [] as Player[]
    return players.filter(p=> p.status==='sold' && p.soldToTeamId===selectedTeamId && (roleFilter==='All' || p.specialization===roleFilter))
  }, [players, selectedTeamId, roleFilter])

  // Auto-select first team when opening roster if none selected
  useEffect(()=> {
    if(rosterOpen && selectedTeamId==null && teams.length){
      setSelectedTeamId(teams[0].id)
    }
  }, [rosterOpen, selectedTeamId, teams])

  if(!setup){
    return (
      <div className='py-16 space-y-4 text-center'>
        <h1 className='text-2xl font-semibold'>No Auction Data</h1>
        <p className='text-sm text-muted-foreground'>Please configure your auction first.</p>
        <Button onClick={()=> window.location.href='/auction-setup'}>Go to Setup</Button>
      </div>
    )
  }

  const undoLastBid = () => {
    if(currentIndex < 0) return
    const player = playersRef.current[currentIndex]
    if(!player || player.status==='sold' || player.status==='unsold') return
    setRecentBids(list => {
      const idx = list.findIndex(b=> b.playerId===player.id) // first (latest) entry for player
      if(idx === -1) return list
      const newList = [...list]
      newList.splice(idx,1)
      const remaining = newList.filter(b=> b.playerId===player.id)
      if(remaining.length){
        setCurrentBid(remaining[0].amount)
        setHighestBidTeamId(remaining[0].teamId)
      } else {
        setCurrentBid(basePrice)
        setHighestBidTeamId(null)
      }
      return newList
    })
  }

  const finishAndStartNew = async () => {
    try {
      if(userId && setup){
        await archiveAuction({
          userId,
          seriesName: setup.seriesName||'Auction',
            seriesLogo: setup.seriesLogo,
            teamCount: setup.teamCount||teams.length,
            unifiedBasePrice: setup.unifiedBasePrice,
            initialPrize: setup.initialPrize||0,
            teams: teams.map(t=> ({ id: t.id, name: t.name, budget: t.budget, owner: t.owner, logo: t.logo })),
            players: players.map(p=> ({ id: p.id, name: p.name, specialization: p.specialization, photo: p.photo, status: p.status, soldToTeamId: p.soldToTeamId, soldPrice: p.soldPrice }))
        } as any)
      }
    } catch(err) { console.warn('Archive failed', err) }
    try { if(userId) await clearSession({ userId } as any) } catch(err) { console.warn('Clear session failed', err) }
    try { localStorage.removeItem('cricketAuctionSetup') } catch(err) { console.warn('Local cleanup failed', err) }
    window.location.href = '/auction-setup'
  }

  // Reauction previously unsold players
  const reauctionUnsold = () => {
    setPlayers(prev => prev.map(p => p.status === 'unsold' ? { ...p, status: 'pending', soldToTeamId: undefined, soldPrice: undefined } : p))
    setReauctionDone(true)
    setCurrentIndex(-1)
    // restart flow
    if(!started) setStarted(true)
    setTimeout(()=> advancePlayer(), 50)
  }

  const skipCurrentPlayer = () => {
    if(current && current.status==='current') {
      // Move current back to pending and advance
      setPlayers(prev => prev.map(p=> p.id===current.id ? { ...p, status: 'pending' } : p))
      setCurrentBid(basePrice)
      setHighestBidTeamId(null)
      advancePlayer()
    }
  }

  return (
    <>
      <div className='space-y-8'>
        <div className='flex flex-col gap-4 md:flex-row md:justify-between md:items-center'>
          <div className='flex items-center gap-4'>
            {setup.seriesLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={setup.seriesLogo} alt='Series Logo' className='h-14 w-14 rounded-md object-cover border' />
            ) : (
              <div className='h-14 w-14 rounded-md border flex items-center justify-center text-[10px] text-muted-foreground'>Logo</div>
            )}
            <div>
              <h1 className='text-2xl font-semibold'>{setup.seriesName||'Auction'}</h1>
              <p className='text-xs text-muted-foreground'>{players.filter(p=> p.status==='sold').length} sold / {players.length}</p>
            </div>
          </div>
          {/* group right-side buttons together */}
          <div className='flex gap-2 ml-auto'>
            {!started && <Button onClick={startAuction} disabled={!players.length}><Play className='h-4 w-4 mr-2'/>Start Auction</Button>}
            {started && (
              <>
                <Button variant='outline' size='sm' onClick={makeShare}><Share2 className='h-4 w-4 mr-1'/>Share</Button>
                <Button variant='outline' size='sm' onClick={()=> setRosterOpen(true)}><Users className='h-4 w-4 mr-1'/>Roster</Button>
                <Button variant='outline' size='sm' onClick={()=> setShowAnalytics(v=> !v)}>
                  <BarChart2 className='h-4 w-4 mr-1'/>{showAnalytics? 'Hide' : 'Analytics'}
                </Button>
                {auctionEnded && (
                  <Button size='sm' variant='secondary' onClick={finishAndStartNew}>Complete Auction</Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className='grid gap-6 lg:grid-cols-[320px_1fr]'>
          {shareInfo && (
            <div className='col-span-full rounded-md border p-3 text-[11px] flex flex-wrap gap-3 items-center bg-blue-500/5'>
              <span className='font-medium flex items-center gap-1'><LinkIcon className='h-3 w-3'/> Live Viewer Link:</span>
              <code className='px-2 py-1 rounded bg-muted text-xs truncate max-w-[360px]'>{shareInfo.url}</code>
              <button onClick={()=> { navigator.clipboard.writeText(shareInfo.url) }} className='text-xs underline'>Copy</button>
              <span className='text-muted-foreground'>Expires {new Date(shareInfo.expiresAt).toLocaleTimeString()}</span>
            </div>
          )}
          <Card className='h-full'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Players</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 max-h-[70vh] overflow-y-auto player-scroll pr-2'>
              {players.map((pl,i)=> {
                const isCurrent = pl.status==='current'
                const isSold = pl.status==='sold'
                const isUnsold = pl.status==='unsold'
                const soldInfo = isSold ? `₹${(pl.soldPrice||0).toLocaleString()} • ${getTeamName(pl.soldToTeamId)}` : ''
                // row background + accent
                let rowBg = 'hover:bg-muted/50'
                if(isSold) rowBg = 'bg-green-500/5'
                else if(isUnsold) rowBg = 'bg-red-500/5'
                else if(isCurrent) rowBg = 'bg-primary/10 blink-live'
                let accent = ''
                if(isSold) accent='border-l-4 border-l-green-500'
                else if(isUnsold) accent='border-l-4 border-l-red-500'
                else if(isCurrent) accent='border-l-4 border-l-primary'
                // status pill styling
                let pillClass = 'bg-muted text-muted-foreground border-border/40'
                if(isSold) pillClass='bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30'
                else if(isUnsold) pillClass='bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                else if(isCurrent) pillClass='bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                const label = isCurrent ? 'LIVE' : (pl.status||'') .toUpperCase()
                return (
                  <button key={pl.id} className={`w-full flex items-center gap-2 rounded-md border px-2 py-2 text-left text-xs transition-colors ${rowBg} ${accent}`} disabled>
                    {anyPhotos && (
                      pl.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pl.photo} onError={e=> (e.currentTarget as HTMLImageElement).src='/player-placeholder.svg'} alt={pl.name} className='h-8 w-8 rounded-full object-cover border' />
                      ) : (
                        <div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground'>{pl.name.slice(0,2).toUpperCase()}</div>
                      )
                    )}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-1 truncate font-medium'>
                        <span className='truncate'>{pl.name}</span>
                      </div>
                      <div className='text-[10px] text-muted-foreground truncate'>
                        {pl.specialization}{soldInfo && ' • '}{soldInfo}
                      </div>
                    </div>
                    <div className={`shrink-0 px-1.5 py-0.5 rounded-sm border text-[9px] font-semibold tracking-wide ${pillClass}`}>{label}</div>
                  </button>
                )
              })}
              {!players.length && <p className='text-xs text-muted-foreground'>No players loaded.</p>}
            </CardContent>
          </Card>
          <div className='space-y-6'>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm flex items-center gap-2'>{current ? <>Current Player</> : 'Waiting to start'}</CardTitle>
              </CardHeader>
              <CardContent>
                {current ? (
                  <div className='flex flex-col md:flex-row gap-6 items-center md:items-start'>
                    <div className='flex flex-col items-center gap-2'>
                      {current.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <div className='relative'>
                          <img src={current.photo} onError={e=> (e.currentTarget as HTMLImageElement).src='/player-placeholder.svg'} alt={current.name} className='h-32 w-32 rounded-full object-cover border blink-live' />
                          {current.status==='sold' && (
                            <div className='absolute inset-0 rounded-full bg-green-600/75 flex flex-col items-center justify-center text-white text-xs font-semibold'>
                              <span>SOLD</span>
                              <span className='mt-1 text-[10px] font-normal px-2 text-center leading-tight'>{getTeamName(current.soldToTeamId)}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className='relative h-32 w-32 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground blink-live'>
                          {current.name.split(' ').slice(0,2).map(s=> s[0]).join('').toUpperCase()}
                          {current.status==='sold' && (
                            <div className='absolute inset-0 rounded-full bg-green-600/75 flex flex-col items-center justify-center text-white text-xs font-semibold'>
                              <span>SOLD</span>
                              <span className='mt-1 text-[10px] font-normal px-2 text-center leading-tight'>{getTeamName(current.soldToTeamId)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className='text-center'>
                        <div className='font-semibold'>{current.name}</div>
                        <div className='text-xs text-muted-foreground'>{current.specialization}</div>
                      </div>
                    </div>
                    <div className='flex-1 w-full space-y-4'>
                      <div className='grid grid-cols-2 gap-3 text-xs'>
                        <div className='rounded-md border p-2 flex flex-col gap-1'>
                          <span className='text-muted-foreground'>Base Price</span>
                          <span className='font-medium'>₹{basePrice.toLocaleString()}</span>
                        </div>
                        <div className='rounded-md border p-2 flex flex-col gap-1'>
                          <span className='text-muted-foreground'>Current Bid</span>
                          <span className='font-semibold text-primary'>₹{currentBid.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className='grid gap-3 md:grid-cols-3 text-[11px]'>
                        <div className='rounded-md border p-2 flex flex-col gap-1'>
                          <span className='text-muted-foreground'>Bid Step</span>
                          <Input type='number' min={1} value={bidStep} onChange={e=> setBidStep(Math.max(1, parseInt(e.target.value)||1))} className='h-7 text-[11px]' />
                        </div>
                        <div className='rounded-md border p-2 flex flex-col gap-1 md:col-span-2'>
                          <span className='text-muted-foreground'>Active Bidder</span>
                          <span className='font-medium text-xs flex items-center gap-1'>
                            {(() => {
                              const team = teams.find(t=> t.id===highestBidTeamId)
                              if(!team) return <span>-</span>
                              return (
                                <>
                                  {team.logo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={team.logo} onError={e=> (e.currentTarget as HTMLImageElement).style.display='none'} alt={team.name} className='h-4 w-4 rounded-full object-cover border' />
                                  ) : (
                                    <div className='h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[8px] text-muted-foreground'>{team.name.slice(0,2).toUpperCase()}</div>
                                  )}
                                  <span className='truncate'>{team.name}</span>
                                </>
                              )
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className='space-y-2'>
                        <div className='text-[11px] font-medium'>Teams (click to bid)</div>
                        <div className='grid gap-2 max-h-40 overflow-y-auto player-scroll pr-1'>
                          {teams.map(t=> {
                            const isHighest = highestBidTeamId===t.id
                            let nextRequired = currentBid
                            if(currentBid < basePrice) nextRequired = basePrice + bidStep
                            else if(!isHighest) nextRequired = currentBid + bidStep
                            const disabled = (!isHighest && t.budget < nextRequired) || current?.status==='sold' || current?.status==='unsold'
                            const color = getTeamColor(t.id)
                            return (
                              <button key={t.id} disabled={disabled} onClick={()=> placeBid(t.id)}
                                className={`flex items-center gap-2 rounded-md border px-2 py-1 text-left text-[11px] hover:bg-muted/60 ${isHighest ? 'font-semibold' : ''} ${disabled? 'opacity-40 cursor-not-allowed' : ''}`}
                                style={isHighest ? {borderColor: color, boxShadow: `0 0 0 1px ${color}`, backgroundColor: color+'22'} : {}}>
                                {t.logo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={t.logo} onError={e=> (e.currentTarget as HTMLImageElement).style.display='none'} alt={t.name} className='h-6 w-6 rounded-full object-cover border' />
                                ) : (
                                  <Users className='h-4 w-4 text-muted-foreground' />
                                )}
                                <span className='flex-1 truncate'>{t.name||`Team ${t.id}`}</span>
                                <span className='text-[10px] font-medium'>₹{t.budget.toLocaleString()}</span>
                              </button>
                            )
                          })}
                        </div>
                        <p className='text-[10px] text-muted-foreground'>Each new bidder raises the price by the bid step. Active bidder highlighted.</p>
                      </div>
                      <div className='space-y-2'>
                        <div className='text-[11px] font-medium flex items-center justify-between'>
                          <span>Recent Activity</span>
                          <button type='button' onClick={()=> current && setRecentBids(list => list.filter(b=> b.playerId!==current.id))} className='text-[10px] text-muted-foreground hover:underline'>Clear</button>
                        </div>
                        <div className='max-h-32 overflow-y-auto player-scroll rounded-md border divide-y'>
                          {currentPlayerBids.length===0 && <div className='text-[10px] p-2 text-muted-foreground'>No bids yet.</div>}
                          {currentPlayerBids.map((b, idx)=> {
                            const isLatest = idx===0
                            const isOpening = openingBidTime != null && b.time === openingBidTime
                            const team = teams.find(t=> t.id===b.teamId)
                            const teamLogoEl = team?.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={team.logo} onError={e=> (e.currentTarget as HTMLImageElement).style.display='none'} alt={team.name} className='h-4 w-4 rounded-full object-cover border' />
                            ) : (
                              <div className='h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[8px] text-muted-foreground'>{(team?.name||'T').slice(0,2).toUpperCase()}</div>
                            )
                            // only highlight the latest (current highest) bid, not all previous bids by same team
                            const highlightCurrent = isLatest
                            const color = highlightCurrent ? getTeamColor(highestBidTeamId || b.teamId) : undefined
                            return (
                              <div key={b.time+''+b.teamId} className={`text-[10px] px-2 py-1 flex justify-between items-center ${isLatest ? 'animate-pulse' : ''} ${isOpening ? 'bg-amber-500/15 border-l-2 border-amber-500' : ''}`}
                                style={highlightCurrent ? {backgroundColor: color + '22', borderLeft: `2px solid ${color}`} : {}}>
                                <span className='truncate flex items-center gap-1'>
                                  {teamLogoEl}
                                  <span className='truncate'>{getTeamName(b.teamId)}</span>
                                </span>
                                <span>₹{b.amount.toLocaleString()}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className='flex gap-2'>
                        <Button size='sm' onClick={sellPlayer} disabled={highestBidTeamId == null || current.status==='sold' || current.status==='unsold'}>Sell</Button>
                        <Button size='sm' variant='outline' onClick={markUnsoldWithPopup} disabled={current.status==='sold' || current.status==='unsold'}>Unsold</Button>
                        <Button size='sm' variant='secondary' onClick={undoLastBid} disabled={current.status==='sold' || current.status==='unsold' || !currentPlayerBids.length}>Undo Bid</Button>
                        <Button size='sm' variant='outline' onClick={skipCurrentPlayer} disabled={current.status==='sold' || current.status==='unsold'}>
                          <SkipForward className='h-4 w-4 mr-1'/>Skip
                        </Button>
                      </div>
                      {current.status==='sold' && (
                        <div className='rounded-md border p-3 text-xs flex flex-wrap items-center gap-4 bg-green-500/5'>
                          <div className='font-medium'>Sold to {getTeamName(current.soldToTeamId)} for ₹{(current.soldPrice||0).toLocaleString()}</div>
                          {auctionEnded && <Button size='sm' variant='secondary' onClick={exportResults}>Download XLSX</Button>}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className='text-sm text-muted-foreground py-8'>{started? 'Auction finished.' : 'Click Start Auction to begin.'}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-sm'>Teams</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                  {teams.map(t=> {
                    const stat = teamStats.find(s=> s.team.id===t.id)
                    const spent = stat?.spent||0
                    const bought = stat?.bought||0
                    const remaining = t.budget
                    const initial = setup.initialPrize
                    const percent = Math.min(100, Math.round(((initial-remaining)/initial)*100))
                    return (
                      <div key={t.id} className='rounded-md border p-3 text-[11px] space-y-2 bg-muted/30'>
                        <div className='flex items-center gap-2'>
                          {t.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.logo} onError={e=> (e.currentTarget as HTMLImageElement).style.display='none'} alt={t.name} className='h-8 w-8 rounded-full object-cover border' />
                          ) : (
                            <div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground'>{t.name.slice(0,2).toUpperCase()}</div>
                          )}
                          <div className='flex-1 min-w-0'>
                            <div className='font-medium truncate'>{t.name||`Team ${t.id}`}</div>
                            <div className='text-[10px] text-muted-foreground'>Bought {bought}</div>
                          </div>
                        </div>
                        <div className='flex justify-between'><span>Spent</span><span>₹{spent.toLocaleString()}</span></div>
                        <div className='flex justify-between'><span>Remain</span><span>₹{remaining.toLocaleString()}</span></div>
                        <div className='h-1.5 w-full bg-muted rounded overflow-hidden'>
                          <div className='h-full bg-primary transition-all' style={{width: percent+'%'}} />
                        </div>
                        {stat?.mostExp && (
                          <div className='text-[10px] text-muted-foreground truncate'>Top: {stat.mostExp.name} ₹{(stat.mostExp.soldPrice||0).toLocaleString()}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {!teams.length && <p className='text-xs text-muted-foreground'>No teams configured.</p>}
              </CardContent>
            </Card>
            {showReauctionPrompt && (
              <Card className='border-dashed'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm'>Reauction Unsold Players</CardTitle>
                </CardHeader>
                <CardContent className='text-[11px] space-y-3'>
                  <p>{players.filter(p=> p.status==='unsold').length} unsold player(s) can be reauctioned.</p>
                  <div className='flex gap-2'>
                    <Button size='sm' onClick={reauctionUnsold}>Reauction Now</Button>
                    <Button size='sm' variant='outline' onClick={()=> setReauctionDone(true)}>Dismiss</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {showAnalytics && (
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm flex items-center gap-2'><BarChart2 className='h-4 w-4'/> Live Analytics</CardTitle>
                </CardHeader>
                <CardContent className='space-y-5 text-[11px]'>
                  {(() => {
                    const totalSold = soldPlayers.length
                    const totalUnsold = players.filter(p=> p.status==='unsold').length
                    const totalPlayers = players.length
                    const totalSpend = soldPlayers.reduce((a,p)=> a + (p.soldPrice||0), 0)
                    const avgPrice = totalSold ? Math.round(totalSpend/totalSold) : 0
                    const roleCounts: Record<string, number> = {
                      Batsman: soldPlayers.filter(p=> p.specialization==='Batsman').length,
                      Bowler: soldPlayers.filter(p=> p.specialization==='Bowler').length,
                      'All-rounder': soldPlayers.filter(p=> p.specialization==='All-rounder').length,
                      'Wicket-keeper': soldPlayers.filter(p=> p.specialization==='Wicket-keeper').length,
                    }
                    const topPlayers = [...soldPlayers].sort((a,b)=> (b.soldPrice||0)-(a.soldPrice||0)).slice(0,5)
                    return (
                      <div className='space-y-6'>
                        <div className='grid gap-3 sm:grid-cols-3 lg:grid-cols-5'>
                          <div className='rounded-md border p-3 bg-muted/30 flex flex-col gap-1'>
                            <span className='text-muted-foreground'>Sold</span>
                            <span className='font-semibold text-sm'>{totalSold} / {totalPlayers}</span>
                          </div>
                          <div className='rounded-md border p-3 bg-muted/30 flex flex-col gap-1'>
                            <span className='text-muted-foreground'>Unsold</span>
                            <span className='font-semibold text-sm'>{totalUnsold}</span>
                          </div>
                          <div className='rounded-md border p-3 bg-muted/30 flex flex-col gap-1'>
                            <span className='text-muted-foreground'>Total Spend</span>
                            <span className='font-semibold text-sm'>₹{totalSpend.toLocaleString()}</span>
                          </div>
                          <div className='rounded-md border p-3 bg-muted/30 flex flex-col gap-1'>
                            <span className='text-muted-foreground'>Avg Price</span>
                            <span className='font-semibold text-sm'>₹{avgPrice.toLocaleString()}</span>
                          </div>
                          {mostExpensiveOverall && (
                            <div className='rounded-md border p-3 bg-muted/30 flex flex-col gap-1'>
                              <span className='text-muted-foreground'>Most Expensive</span>
                              <span className='font-semibold text-xs truncate'>{mostExpensiveOverall.name}</span>
                              <span className='text-[10px]'>₹{(mostExpensiveOverall.soldPrice||0).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        <div className='grid gap-4 md:grid-cols-2'>
                          <div className='rounded-md border p-3 bg-muted/20'>
                            <div className='font-medium mb-2 text-xs'>Role Distribution</div>
                            <div className='space-y-2'>
                              {Object.entries(roleCounts).map(([role,count])=> {
                                const pct = totalSold? Math.round((count/totalSold)*100) : 0
                                return (
                                  <div key={role} className='flex items-center gap-2'>
                                    <div className='w-28 text-[10px] truncate'>{role}</div>
                                    <div className='flex-1 h-2 rounded bg-muted overflow-hidden'>
                                      <div className='h-full bg-primary' style={{width: pct+'%'}} />
                                    </div>
                                    <div className='w-10 text-right text-[10px]'>{count}</div>
                                  </div>
                                )
                              })}
                              {!totalSold && <div className='text-[10px] text-muted-foreground'>No players sold yet.</div>}
                            </div>
                          </div>
                          <div className='rounded-md border p-3 bg-muted/20'>
                            <div className='font-medium mb-2 text-xs'>Top Players</div>
                            <div className='space-y-1'>
                              {topPlayers.length ? topPlayers.map(p=> (
                                <div key={p.id} className='flex justify-between items-center text-[10px] rounded px-2 py-1 border bg-background/40'>
                                  <span className='truncate flex-1 mr-2'>{p.name}</span>
                                  <span className='font-medium'>₹{(p.soldPrice||0).toLocaleString()}</span>
                                </div>
                              )) : <div className='text-[10px] text-muted-foreground'>No sales yet.</div>}
                            </div>
                          </div>
                        </div>
                        <div className='rounded-md border p-3 bg-muted/20'>
                          <div className='font-medium mb-2 text-xs'>Team Spend Snapshot</div>
                          <div className='space-y-2'>
                            {teamStats.map(s=> {
                              const initial = setup?.initialPrize||0
                              const spent = s.spent
                              const pct = initial? Math.round((spent/initial)*100) : 0
                              return (
                                <div key={'ts-'+s.team.id} className='flex items-center gap-2 text-[10px]'>
                                  <div className='w-28 truncate'>{s.team.name}</div>
                                  <div className='flex-1 h-2 rounded bg-muted overflow-hidden'><div className='h-full bg-primary/70' style={{width: Math.min(100,pct)+'%'}} /></div>
                                  <div className='w-20 text-right'>₹{spent.toLocaleString()}</div>
                                </div>
                              )
                            })}
                            {!teamStats.length && <div className='text-[10px] text-muted-foreground'>No teams.</div>}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {popup && (
          <motion.div
            key={popup.player + popup.type}
            initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 240, damping: 18 } }}
            exit={{ opacity: 0, scale: 0.6, rotate: 4, transition: { duration: 0.25 } }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <motion.div
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { delay: 0.08 } }}
              className={`relative pointer-events-auto w-[300px] rounded-2xl p-5 shadow-2xl border backdrop-blur-md overflow-hidden ${popup.type==='sold' ? 'bg-emerald-600/95 border-emerald-500' : 'bg-rose-600/95 border-rose-500'} text-white`}
              style={popup.type==='sold' && popup.color ? { boxShadow: `0 0 0 2px ${popup.color}40, 0 0 24px ${popup.color}80`, borderColor: popup.color } : {}}
            >
              {/* radial glow */}
              <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none" style={{background: popup.type==='sold' ? 'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.5), transparent 60%)' : 'radial-gradient(circle at 30% 30%, rgba(244,63,94,0.5), transparent 60%)'}} />
              <div className="relative flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full animate-ping bg-white/25" />
                  {popup.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={popup.photo} onError={e=> (e.currentTarget as HTMLImageElement).src='/player-placeholder.svg'} alt={popup.player} className="h-24 w-24 rounded-full object-cover border-4 border-white/40 shadow-lg" />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-black/20 flex items-center justify-center text-2xl font-bold border-4 border-white/40 shadow-lg">
                      {popup.player.split(' ').slice(0,2).map(s=> s[0]).join('').toUpperCase()}
                    </div>
                  )}
                  {popup.type==='sold' && (
                    <motion.div
                      initial={{ rotate: -50, y: -10, x: 50, opacity: 0 }}
                      animate={{ rotate: -12, y: -18, x: 42, opacity: 1, transition: { delay: 0.15, type: 'spring', stiffness: 260, damping: 12 } }}
                      className="absolute top-0 right-0 text-white"
                    >
                      <Gavel className="h-10 w-10 drop-shadow-xl" />
                    </motion.div>
                  )}
                </div>
                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="w-full text-center space-y-1">
                  <div className="text-3xl font-extrabold tracking-wider drop-shadow-md">
                    {popup.type==='sold' ? 'SOLD!' : 'UNSOLD'}
                  </div>
                  <div className="text-sm font-medium truncate">{popup.player}</div>
                  {popup.specialization && <div className="text-[11px] opacity-80 uppercase tracking-wide">{popup.specialization}</div>}
                  {popup.type==='sold' && (
                    <div className="text-xs mt-1 flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2 font-semibold">
                        {popup.teamLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={popup.teamLogo} alt={popup.team} className="h-5 w-5 rounded-full object-cover border border-white/40" />
                        ) : null}
                        <span className="truncate max-w-[160px]">{popup.team}</span>
                      </div>
                      <div className="text-[11px] font-medium bg-black/25 px-2 py-0.5 rounded-md">₹{(popup.price||0).toLocaleString()}</div>
                    </div>
                  )}
                  <div className="text-[10px] opacity-70 pt-2">Next player loading...</div>
                </motion.div>
                {popup.type==='sold' && (
                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { delay: 0.25, type: 'spring', stiffness: 180, damping: 14 } }} className="absolute inset-0 rounded-2xl ring-4 ring-white/30" />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Roster Overlay */}
      <AnimatePresence>
        {rosterOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm'>
            <motion.div initial={{scale:.9, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} exit={{scale:.9, y:20, opacity:0}} transition={{type:'spring', stiffness:200, damping:20}} className='w-full max-w-6xl h-[80vh] bg-background border rounded-xl shadow-2xl overflow-hidden flex'>
              {/* Left Team Tabs */}
              <div className='w-60 border-r bg-muted/30 flex flex-col'>
                <div className='p-4 flex items-center justify-between'>
                  <h3 className='text-sm font-semibold'>Teams</h3>
                  <button onClick={()=> setRosterOpen(false)} className='text-[11px] text-muted-foreground hover:text-foreground'>✕</button>
                </div>
                <div className='overflow-y-auto player-scroll flex-1 p-2 space-y-2'>
                  {teams.map(t=> {
                    const soldCount = players.filter(p=> p.status==='sold' && p.soldToTeamId===t.id).length
                    const active = selectedTeamId===t.id
                    return (
                      <button key={'roster-team-'+t.id} onClick={()=> { setSelectedTeamId(t.id); setRoleFilter('All') }} className={`w-full text-left rounded-md border px-3 py-2 flex items-center gap-2 text-xs hover:bg-accent/40 transition ${active ? 'bg-accent text-accent-foreground border-accent' : 'bg-background/40'}`}> 
                        {t.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.logo} alt={t.name} className='h-6 w-6 rounded-full object-cover border' />
                        ) : (
                          <div className='h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] text-muted-foreground'>{t.name.slice(0,2).toUpperCase()}</div>
                        )}
                        <span className='truncate flex-1'>{t.name||`Team ${t.id}`}</span>
                        <span className='text-[9px] font-medium opacity-70'>{soldCount}</span>
                      </button>
                    )
                  })}
                  {!teams.length && <p className='text-[11px] text-muted-foreground px-2'>No teams</p>}
                </div>
                <div className='p-3 border-t text-[10px] text-muted-foreground'>Sold players by team & role filter.</div>
              </div>
              {/* Right Content */}
              <div className='flex-1 flex flex-col'>
                <div className='p-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='space-y-1'>
                    <h4 className='text-sm font-semibold'>{teams.find(t=> t.id===selectedTeamId)?.name || 'Select a Team'}</h4>
                    <p className='text-[11px] text-muted-foreground'>Showing {rosterPlayers.length} player{rosterPlayers.length!==1?'s':''}{roleFilter!=='All' && ` • ${roleFilter}`}</p>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {(['All','Batsman','Bowler','All-rounder','Wicket-keeper'] as const).map(r=> (
                      <button key={r} onClick={()=> setRoleFilter(r)} className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition ${roleFilter===r ? 'bg-primary text-primary-foreground border-primary shadow' : 'hover:bg-muted'}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <div className='flex-1 overflow-y-auto player-scroll p-5'>
                  {rosterPlayers.length ? (
                    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                      {rosterPlayers.map(pl=> (
                        <div key={'rp-'+pl.id} className='rounded-lg border bg-muted/30 hover:bg-muted/50 transition p-3 flex flex-col gap-3 relative'>
                          <div className='flex items-center gap-3'>
                            {pl.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={pl.photo} onError={e=> (e.currentTarget as HTMLImageElement).src='/player-placeholder.svg'} alt={pl.name} className='h-14 w-14 rounded-full object-cover border shadow-sm' />
                            ) : (
                              <div className='h-14 w-14 rounded-full bg-muted flex items-center justify-center text-[13px] font-semibold text-muted-foreground'>{pl.name.split(' ').slice(0,2).map(s=> s[0]).join('').toUpperCase()}</div>
                            )}
                            <div className='flex-1 min-w-0'>
                              <div className='font-medium truncate text-sm'>{pl.name}</div>
                              <div className='text-[11px] text-muted-foreground truncate'>{pl.specialization}{pl.age ? ` • Age ${pl.age}` : ''}</div>
                            </div>
                            <div className='text-[11px] font-semibold px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30'>₹{(pl.soldPrice||0).toLocaleString()}</div>
                          </div>
                          <div className='flex justify-between text-[10px] text-muted-foreground pt-1'>
                            <span>ID #{pl.id}</span>
                            <span>{pl.soldToTeamId ? 'Picked' : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='text-xs text-muted-foreground'>No players match the current filter.</div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
