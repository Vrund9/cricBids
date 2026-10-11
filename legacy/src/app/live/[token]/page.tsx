'use client'
import { useParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface Player { id:number; name:string; specialization:string; photo?:string; status?:string; soldToTeamId?:number; soldPrice?:number }
interface Team { id:number; name:string; budget:number; logo?:string }

export default function PublicLiveView(){
  const { token } = useParams<{token:string}>()
  const data = useQuery((api as any).auctionSession.getByShareToken, token ? { token } : undefined) as any
  const [mounted, setMounted] = useState(false)
  useEffect(()=> { setMounted(true) }, [])
  const players: Player[] = data?.players||[]
  const teams: Team[] = data?.teams||[]
  const current = (typeof data?.currentIndex==='number' && data.currentIndex>=0) ? players[data.currentIndex] : null
  const getTeamName = (id?:number|null) => teams.find(t=> t.id===id)?.name || ''
  const soldPlayers = players.filter(p=> p.status==='sold')
  const unsoldPlayers = players.filter(p=> p.status==='unsold')
  const progressPct = players.length? Math.round(((soldPlayers.length + unsoldPlayers.length)/players.length)*100):0
  const recentBids = useMemo(()=> (data?.recentBids||[]).filter((b:any)=> current && b.playerId===current.id), [data, current])

  if(!mounted) return null
  if(!token) return <div className='py-16 text-center text-sm'>Missing token.</div>
  if(token && data===undefined) return <div className='py-16 text-center text-sm'>Loading live auction…</div>
  if(!data) return <div className='py-16 text-center text-sm'>Invalid or expired link.</div>

  return (
    <div className='space-y-8'>
      <div className='flex flex-col gap-2 items-center text-center'>
        {data.seriesLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.seriesLogo} alt='Series' className='h-16 w-16 rounded-full object-cover border'/>
        ) : null}
        <h1 className='text-2xl font-semibold'>{data.seriesName||'Live Auction'}</h1>
        <p className='text-xs text-muted-foreground'>{soldPlayers.length} settled / {players.length} • {progressPct}%</p>
      </div>

      <div className='grid gap-6 lg:grid-cols-[300px_1fr]'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm'>Players</CardTitle>
          </CardHeader>
            <CardContent className='space-y-2 max-h-[70vh] overflow-y-auto player-scroll pr-2'>
              {players.map((pl,i)=> {
                const isCurrent = i===data.currentIndex && pl.status==='current'
                const isSold = pl.status==='sold'
                const isUnsold = pl.status==='unsold'
                let rowBg = 'hover:bg-muted/50'
                if(isSold) rowBg = 'bg-green-500/5'
                else if(isUnsold) rowBg = 'bg-red-500/5'
                else if(isCurrent) rowBg = 'bg-primary/10 blink-live'
                const label = isCurrent? 'LIVE' : (pl.status||'').toUpperCase()
                let pillClass = 'bg-muted text-muted-foreground border-border/40'
                if(isSold) pillClass='bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30'
                else if(isUnsold) pillClass='bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                else if(isCurrent) pillClass='bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                return (
                  <div key={pl.id} className={`w-full flex items-center gap-2 rounded-md border px-2 py-2 text-left text-xs ${rowBg}`}>
                    {pl.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pl.photo} onError={e=> (e.currentTarget as HTMLImageElement).src='/player-placeholder.svg'} alt={pl.name} className='h-8 w-8 rounded-full object-cover border'/>
                    ) : (
                      <div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground'>{pl.name.slice(0,2).toUpperCase()}</div>
                    )}
                    <div className='flex-1 min-w-0'>
                      <div className='truncate font-medium'>{pl.name}</div>
                      <div className='text-[10px] text-muted-foreground truncate'>{pl.specialization}{isSold && ` • ₹${(pl.soldPrice||0).toLocaleString()} • ${getTeamName(pl.soldToTeamId)}`}</div>
                    </div>
                    <div className={`shrink-0 px-1.5 py-0.5 rounded-sm border text-[9px] font-semibold ${pillClass}`}>{label}</div>
                  </div>
                )
              })}
            </CardContent>
        </Card>
        <div className='space-y-6'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Current Player</CardTitle>
            </CardHeader>
            <CardContent>
              {current ? (
                <div className='flex flex-col md:flex-row gap-6 items-center md:items-start'>
                  <div className='flex flex-col items-center gap-2'>
                    {current.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={current.photo} onError={e=> (e.currentTarget as HTMLImageElement).src='/player-placeholder.svg'} alt={current.name} className='h-32 w-32 rounded-full object-cover border blink-live'/>
                    ) : (
                      <div className='h-32 w-32 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground blink-live'>
                        {current.name.split(' ').slice(0,2).map(s=> s[0]).join('').toUpperCase()}
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
                        <span className='font-medium'>₹{(data.unifiedBasePrice||0).toLocaleString()}</span>
                      </div>
                      <div className='rounded-md border p-2 flex flex-col gap-1'>
                        <span className='text-muted-foreground'>Current Bid</span>
                        <span className='font-semibold text-primary'>₹{(data.currentBid||0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className='space-y-2'>
                      <div className='text-[11px] font-medium'>Recent Activity</div>
                      <div className='max-h-32 overflow-y-auto player-scroll rounded-md border divide-y'>
                        {recentBids.length===0 && <div className='text-[10px] p-2 text-muted-foreground'>No bids yet.</div>}
                        {recentBids.map((b:any, idx:number)=> {
                          const team = teams.find(t=> t.id===b.teamId)
                          return (
                            <div key={b.time+''+b.teamId} className={`text-[10px] px-2 py-1 flex justify-between items-center ${idx===0?'animate-pulse':''}`}>
                              <span className='truncate flex items-center gap-1'>
                                <span className='font-medium'>{team?.name||'Team'}</span>
                              </span>
                              <span>₹{b.amount.toLocaleString()}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='text-sm text-muted-foreground py-8'>{data.started? 'Waiting for next player...' : 'Auction not started yet.'}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Teams</CardTitle>
            </CardHeader>
            <CardContent className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
              {teams.map(t=> {
                const sold = players.filter(p=> p.status==='sold' && p.soldToTeamId===t.id)
                const spent = sold.reduce((a,p)=> a + (p.soldPrice||0), 0)
                return (
                  <div key={t.id} className='rounded-md border p-3 text-[11px] space-y-1 bg-muted/30'>
                    <div className='flex items-center gap-2'>
                      {t.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.logo} onError={e=> (e.currentTarget as HTMLImageElement).style.display='none'} alt={t.name} className='h-8 w-8 rounded-full object-cover border'/>
                      ) : (
                        <div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground'>{t.name.slice(0,2).toUpperCase()}</div>
                      )}
                      <div className='flex-1 min-w-0'>
                        <div className='font-medium truncate'>{t.name}</div>
                        <div className='text-[10px] text-muted-foreground'>Bought {sold.length}</div>
                      </div>
                    </div>
                    <div className='flex justify-between'><span>Spent</span><span>₹{spent.toLocaleString()}</span></div>
                    <div className='flex justify-between'><span>Remain</span><span>₹{t.budget.toLocaleString()}</span></div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
      <div className='text-center text-[11px] text-muted-foreground pt-4'>Read‑only live view • auto refresh via Convex real‑time queries</div>
    </div>
  )
}
