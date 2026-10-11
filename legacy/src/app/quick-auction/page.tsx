'use client'
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Player { id:number; name:string; role:'Batsman'|'Bowler'|'All-rounder'|'Wicket-keeper'; base:number; bid:number; status:'upcoming'|'current'|'sold'|'unsold'; }
interface Team { id:number; name:string; purse:number; players:Player[] }

const initialPlayers: Player[] = [
  { id:1, name:'Virat Kohli', role:'Batsman', base:200000, bid:200000, status:'current' },
  { id:2, name:'Pat Cummins', role:'Bowler', base:180000, bid:180000, status:'upcoming' },
  { id:3, name:'Hardik Pandya', role:'All-rounder', base:170000, bid:170000, status:'upcoming' },
  { id:4, name:'Jasprit Bumrah', role:'Bowler', base:160000, bid:160000, status:'upcoming' },
  { id:5, name:'David Warner', role:'Batsman', base:150000, bid:150000, status:'upcoming' },
  { id:6, name:'KL Rahul', role:'Wicket-keeper', base:140000, bid:140000, status:'upcoming' },
]

const initTeams: Team[] = [
  { id:1, name:'India', purse:1000000, players:[] },
  { id:2, name:'Australia', purse:1000000, players:[] },
]

export default function QuickAuction(){
  const [players,setPlayers] = useState<Player[]>(initialPlayers)
  const [teams,setTeams] = useState<Team[]>(initTeams)
  const [current,setCurrent] = useState<Player>(initialPlayers[0])
  const [bids,setBids] = useState<{team:number; amount:number; ts:number}[]>([])
  const [active,setActive] = useState(false)
  const increment = (v:number)=> v < 1000000 ? 25000 : 50000
  const leading = bids[bids.length-1]
  const leadingTeam = leading? teams.find(t=>t.id===leading.team) : null

  const start = ()=> setActive(true)
  const placeBid = (teamId:number)=>{
    if(!active) return
    const next = (leading? leading.amount : current.bid) + increment(leading? leading.amount : current.bid)
    const t = teams.find(t=> t.id===teamId)
    if(!t || t.purse < next) return
    setBids(b=> [...b,{team:teamId, amount:next, ts:Date.now()}])
  }
  const finalize = (sold:boolean)=>{
    setPlayers(p=> p.map(pl=> pl.id===current.id ? ({...pl, status: sold? 'sold':'unsold', bid: leading? leading.amount: pl.base}) : pl))
    if(sold && leadingTeam){
      setTeams(ts=> ts.map(t=> t.id===leadingTeam.id ? ({...t, purse: t.purse - leading.amount, players:[...t.players,{...current, bid: leading.amount, status:'sold'}]}) : t))
    }
    const remaining = players.filter(pl=> pl.status==='upcoming' && pl.id!==current.id)
    if(remaining.length){
      const nextPl = remaining[0]
      setCurrent(nextPl)
      setBids([])
      setActive(false)
      setPlayers(p=> p.map(pl=> pl.id===nextPl.id ? ({...pl, status:'current'}) : pl))
    } else {
      setActive(false)
    }
  }
  const fmt = (n:number)=> n>=1000000? '₹'+(n/1000000).toFixed(1)+'M': '₹'+n.toLocaleString()
  return (
    <div className='space-y-8 py-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Quick Demo Auction</h1>
          <p className='text-sm text-muted-foreground'>India vs Australia · Read-only showcase</p>
        </div>
        <Button variant='outline' asChild><a href='/pricing'>Upgrade</a></Button>
      </div>
      <div className='grid lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center justify-between'>
                <span>{current.name}</span>
                <Badge variant='secondary'>{current.role}</Badge>
              </CardTitle>
              <CardDescription>Base {fmt(current.base)}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='text-center rounded border p-4'>
                <p className='text-xs uppercase tracking-wide text-muted-foreground mb-1'>Current Bid</p>
                <p className='text-4xl font-bold'>{fmt(leading? leading.amount: current.bid)}</p>
                {leadingTeam && <p className='text-xs text-muted-foreground mt-1'>Leading: {leadingTeam.name}</p>}
              </div>
              <div className='flex gap-3'>
                {!active ? <Button className='flex-1' onClick={start}>Start</Button> : <>
                  <Button className='flex-1' onClick={()=> finalize(true)} disabled={!leading}>Mark Sold</Button>
                  <Button className='flex-1' variant='destructive' onClick={()=> finalize(false)}>Unsold</Button>
                </>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className='text-sm'>Teams</CardTitle><CardDescription>Tap to simulate bids</CardDescription></CardHeader>
            <CardContent className='grid sm:grid-cols-2 gap-3'>
              {teams.map(t=>{
                const next = (leading? leading.amount: current.bid) + increment(leading? leading.amount: current.bid)
                const can = active && t.purse >= next
                return (
                  <Button key={t.id} variant={leadingTeam?.id===t.id? 'secondary':'outline'} disabled={!can} onClick={()=> placeBid(t.id)} className='h-auto py-3 flex-col items-start gap-1'>
                    <div className='flex w-full items-center justify-between text-sm'><span>{t.name}</span><span className='text-xs text-muted-foreground'>{t.players.length}</span></div>
                    <div className='w-full flex justify-between text-[11px] text-muted-foreground'>
                      <span>Purse {fmt(t.purse)}</span>{can && <span>Bid {fmt(next)}</span>}
                    </div>
                  </Button>)
              })}
            </CardContent>
          </Card>
        </div>
        <div className='space-y-6'>
          <Card>
            <CardHeader><CardTitle className='text-sm'>Upcoming</CardTitle></CardHeader>
            <CardContent className='space-y-2 max-h-60 overflow-y-auto text-xs'>
              {players.filter(p=> p.status==='upcoming').map(p=> (
                <div key={p.id} className='flex items-center justify-between rounded border px-2 py-1'>
                  <span>{p.name}</span><span className='text-muted-foreground'>{fmt(p.base)}</span>
                </div>
              ))}
              {players.filter(p=> p.status==='upcoming').length===0 && <p className='text-muted-foreground'>No remaining</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className='text-sm'>Recent Bids</CardTitle></CardHeader>
            <CardContent className='space-y-1 max-h-40 overflow-y-auto text-[11px]'>
              {bids.slice(-10).reverse().map(b=>{
                const tm = teams.find(t=> t.id===b.team)
                return <div key={b.ts} className='flex items-center justify-between rounded border px-2 py-1'><span>{tm?.name}</span><span className='font-medium'>{fmt(b.amount)}</span></div>
              })}
              {bids.length===0 && <p className='text-muted-foreground'>No bids yet</p>}
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className='text-sm'>Sold Players</CardTitle></CardHeader>
        <CardContent className='grid sm:grid-cols-2 gap-2 text-xs'>
          {teams.flatMap(t=> t.players.map(p=> ({...p, team:t.name}))).map(p=> (
            <div key={p.id} className='flex items-center justify-between rounded border px-2 py-1'>
              <span>{p.name} <span className='text-muted-foreground'>→ {p.team}</span></span>
              <span className='font-medium'>{fmt(p.bid)}</span>
            </div>
          ))}
          {teams.every(t=> t.players.length===0) && <p className='text-muted-foreground'>None yet</p>}
        </CardContent>
      </Card>
    </div>)
}
