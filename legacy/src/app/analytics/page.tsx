'use client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface ArchiveTeam { id:number; name:string; budget:number; owner?:string; logo?:string }
interface ArchivePlayer { id:number; name:string; specialization:string; soldToTeamId?:number; soldPrice?:number; status?:string }
interface ArchiveDoc { _id:string; seriesName:string; teams:ArchiveTeam[]; players:ArchivePlayer[]; totalSpent:number; createdAt:number }

// Recharts (client-side only)
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts'

export default function Analytics() {
  const [boot, setBoot] = useState(false)
  const [userId, setUserId] = useState<string|undefined>(undefined)
  useEffect(()=>{
    try { const raw = localStorage.getItem('ca_user'); if(raw){ const parsed = JSON.parse(raw); if(parsed?.id) setUserId(parsed.id) } } catch{} finally { setBoot(true) }
  },[])
  const validUserId = typeof userId === 'string' && userId.length>0 ? userId : undefined
  const archives = useQuery((api as any).auctionSession.listArchivedAuctions, validUserId ? { userId: validUserId } : undefined) as unknown as ArchiveDoc[] | undefined

  const stats = useMemo(()=> {
    if(!archives || !archives.length) return {
      totalAuctions:0, totalSpent:0, playersSold:0, avgPrice:0, topPlayers:[] as ArchivePlayer[], roleCounts:{} as Record<string,number>, teamSpend:[] as {teamId:number; name:string; spent:number}[]
    }
    const allSold: ArchivePlayer[] = []
    const roleCounts: Record<string, number> = {}
    const teamSpendMap: Record<number, { name:string; spent:number }> = {}
    let totalSpent = 0
    for(const a of archives){
      for(const p of a.players){
        if(p.status==='sold'){ allSold.push(p); totalSpent += p.soldPrice||0; roleCounts[p.specialization] = (roleCounts[p.specialization]||0)+1 }
      }
      for(const t of a.teams){
        const spentByTeam = a.players.filter(p=> p.status==='sold' && p.soldToTeamId===t.id).reduce((s,p)=> s + (p.soldPrice||0),0)
        if(!teamSpendMap[t.id]) teamSpendMap[t.id] = { name: t.name, spent: 0 }
        teamSpendMap[t.id].spent += spentByTeam
      }
    }
    const playersSold = allSold.length
    const avgPrice = playersSold ? Math.round(totalSpent / playersSold) : 0
    const topPlayers = [...allSold].sort((a,b)=> (b.soldPrice||0) - (a.soldPrice||0)).slice(0,10)
    const teamSpend = Object.entries(teamSpendMap).map(([id,v])=> ({ teamId: Number(id), name: v.name, spent: v.spent })).sort((a,b)=> b.spent - a.spent)
    return { totalAuctions: archives.length, totalSpent, playersSold, avgPrice, topPlayers, roleCounts, teamSpend }
  },[archives])

  // Derived datasets for charts
  const roleData = useMemo(()=> Object.entries(stats.roleCounts).map(([role,count])=> ({ role, count })), [stats])
  const teamSpendData = useMemo(()=> stats.teamSpend.map(t=> ({ name: t.name, spent: t.spent })), [stats])
  const topPlayersData = useMemo(()=> stats.topPlayers.map(p=> ({ name: p.name, price: p.soldPrice||0 })), [stats])
  const priceTrendData = useMemo(()=> {
    // Flatten all sold players chronologically across archives for a simple trend
    if(!archives) return [] as { idx:number; price:number }[]
    const sold: { price:number }[] = []
    for(const a of archives){
      for(const p of a.players){ if(p.status==='sold' && (p.soldPrice||0)>0) sold.push({ price: p.soldPrice||0 }) }
    }
    return sold.map((p,i)=> ({ idx: i+1, price: p.price }))
  },[archives])

  const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#ec4899','#84cc16']

  if(!boot) return null
  if(!validUserId) return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-semibold">Analytics Restricted</h1>
      <p className="text-sm text-muted-foreground max-w-sm">Login to view your historical auction analytics.</p>
      <div className="flex gap-3 text-sm"><Link href="/login" className="underline">Login</Link><span className="text-muted-foreground">/</span><Link href="/signup" className="underline">Sign Up</Link></div>
    </div>
  )

  const noData = archives && archives.length===0

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground">Insights from your archived auctions</p>
      </div>

      {noData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">No Archived Auctions</CardTitle>
            <CardDescription>Run and finish an auction to generate analytics.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!noData && (
        <>
          {/* KPI Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            {[{label:'Total Auctions', value: stats.totalAuctions.toString()},{label:'Players Sold', value: stats.playersSold.toString()},{label:'Total Spent', value: '₹'+stats.totalSpent.toLocaleString()},{label:'Avg Price', value: '₹'+stats.avgPrice.toLocaleString()}].map(m=> (
              <Card key={m.label} className="bg-muted/30">
                <CardHeader className="py-4">
                  <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground">{m.label}</CardTitle>
                  <CardDescription className="text-xl font-semibold text-foreground">{m.value}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="grid gap-8 xl:grid-cols-3">
            {/* Role Distribution Pie */}
            <Card className="min-h-[340px]">
              <CardHeader>
                <CardTitle className="text-sm">Role Distribution</CardTitle>
                <CardDescription>Proportion of sold players per role</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                {roleData.length===0 && <div className="text-xs text-muted-foreground">No data</div>}
                {roleData.length>0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roleData} dataKey="count" nameKey="role" outerRadius={90} innerRadius={40} paddingAngle={3}>
                        {roleData.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RTooltip formatter={(v:any, n:any)=> [v, n==='count' ? 'Players' : n]} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Team Spend Bar */}
            <Card className="min-h-[340px]">
              <CardHeader>
                <CardTitle className="text-sm">Team Spending</CardTitle>
                <CardDescription>Total spend (₹)</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                {teamSpendData.length===0 && <div className="text-xs text-muted-foreground">No data</div>}
                {teamSpendData.length>0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamSpendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tickFormatter={(v:number)=> '₹'+(v/1000>=1? (v/1000).toFixed(1)+'k': v.toLocaleString())} tick={{ fontSize: 11 }} />
                      <RTooltip formatter={(v:any)=> '₹'+Number(v).toLocaleString()} />
                      <Bar dataKey="spent" radius={[4,4,0,0]}>
                        {teamSpendData.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Players Bar */}
            <Card className="min-h-[340px]">
              <CardHeader>
                <CardTitle className="text-sm">Top Players (Price)</CardTitle>
                <CardDescription>Highest sale values</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                {topPlayersData.length===0 && <div className="text-xs text-muted-foreground">No data</div>}
                {topPlayersData.length>0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topPlayersData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                      <YAxis tickFormatter={(v:number)=> '₹'+v.toLocaleString()} tick={{ fontSize: 11 }} />
                      <RTooltip formatter={(v:any)=> '₹'+Number(v).toLocaleString()} />
                      <Bar dataKey="price" radius={[4,4,0,0]} fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Price Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Price Trend</CardTitle>
              <CardDescription>Sequential sold player prices</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              {priceTrendData.length===0 && <div className="text-xs text-muted-foreground">No trend data</div>}
              {priceTrendData.length>0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceTrendData} margin={{ top: 15, right: 20, left: -5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis dataKey="idx" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v:number)=> '₹'+v.toLocaleString()} tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v:any)=> '₹'+Number(v).toLocaleString()} labelFormatter={(l:number)=> 'Player #'+l} />
                    <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
