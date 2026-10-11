'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Flag, Users, Shield, UserPlus, Wallet, Play, Check } from 'lucide-react'

interface AuctionSetup {
  seriesName: string
  teamCount: number
  teams: Team[]
  players: Player[]
  initialPrize: number
  currentStep: number
  minPlayersPerTeam?: number
  unifiedBasePrice?: number
  playerInputMode?: 'manual' | 'excel'
  lastUploadFileName?: string
  seriesLogo?: string // added
}

interface Team {
  id: number
  name: string
  budget: number
  color: string
  owner?: string
  logo?: string // added
}

interface Player {
  id: number
  name: string
  specialization: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper'
  photo?: string
}

const stepperSteps = [
  { id: 1, title: 'Series Name', description: 'Name your cricket series', icon: Flag },
  { id: 2, title: 'Team Count', description: 'Choose number of teams', icon: Users },
  { id: 3, title: 'Team Selection', description: 'Configure team details', icon: Shield },
  { id: 4, title: 'Player Info', description: 'Add player database', icon: UserPlus },
  { id: 5, title: 'Initial Prize', description: 'Set budget & base prices', icon: Wallet },
  { id: 6, title: 'Start Auction', description: 'Review and begin', icon: Play }
]

export default function AuctionSetup() {
  const [currentStep, setCurrentStep] = useState(1)
  const [auctionSetup, setAuctionSetup] = useState<AuctionSetup>({
    seriesName: '',
    teamCount: 4,
    teams: [],
    players: [],
    initialPrize: 1000000,
    currentStep: 1,
    minPlayersPerTeam: 11,
    unifiedBasePrice: 50000,
    playerInputMode: 'manual',
    lastUploadFileName: ''
  })
  const [userId, setUserId] = useState<any>(null)
  const [starting, setStarting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const hydratedRef = useRef(false)
  const upsert = useMutation((api as any).auctionSession.upsertProgress)
  const clearSession = useMutation((api as any).auctionSession.clearSession)
  const remoteSession = useQuery((api as any).auctionSession.getLatestForUser, userId ? { userId } : undefined)

  useEffect(()=> {
    // load user id from localStorage once
    try {
      const stored = localStorage.getItem('ca_user')
      if(stored){ const parsed = JSON.parse(stored); if(parsed?.id) setUserId(parsed.id) }
    } catch(_) { /* ignore */ }
  }, [])

  useEffect(()=> {
    if(!remoteSession || hydratedRef.current) return
    // hydrate local state from remote saved progress (pre-auction steps)
    const rs: any = remoteSession
    setCurrentStep(rs.step || rs.currentStep || 1)
    setAuctionSetup(prev => ({
      ...prev,
      seriesName: rs.seriesName || prev.seriesName,
      teamCount: rs.teamCount || prev.teamCount,
      teams: rs.teams || prev.teams,
      players: rs.players ? rs.players.map((p:any)=> ({ id: p.id, name: p.name, specialization: p.specialization, photo: p.photo })) : prev.players,
      initialPrize: rs.initialPrize ?? prev.initialPrize,
      currentStep: rs.step || rs.currentStep || prev.currentStep,
      minPlayersPerTeam: rs.minPlayersPerTeam ?? prev.minPlayersPerTeam,
      unifiedBasePrice: rs.unifiedBasePrice ?? prev.unifiedBasePrice,
      seriesLogo: rs.seriesLogo || prev.seriesLogo
    }))
    hydratedRef.current = true
  }, [remoteSession])

  // debounce save progress for steps before auction start
  const saveTimer = useRef<NodeJS.Timeout|null>(null)
  useEffect(()=> {
    if(!userId) return
    if(saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(()=> {
      try {
        upsert({
          userId,
            step: currentStep,
            seriesName: auctionSetup.seriesName,
            seriesLogo: auctionSetup.seriesLogo, // persist series logo
            teamCount: auctionSetup.teamCount,
            unifiedBasePrice: auctionSetup.unifiedBasePrice,
            minPlayersPerTeam: auctionSetup.minPlayersPerTeam,
            initialPrize: auctionSetup.initialPrize,
            teams: auctionSetup.teams.map(t=> ({ id: t.id, name: t.name, budget: t.budget, owner: t.owner, logo: t.logo })),
            players: auctionSetup.players.map(p=> ({ id: p.id, name: p.name, specialization: p.specialization, photo: p.photo })),
            started: false,
        } as any)
      } catch(err){ console.warn('Remote save failed', err) }
    }, 500)
    return ()=> { if(saveTimer.current) clearTimeout(saveTimer.current) }
  }, [auctionSetup, currentStep, userId])

  const immediatePersist = () => {
    if(!userId) return
    if(saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    try {
      upsert({
        userId,
        step: currentStep,
        seriesName: auctionSetup.seriesName,
        seriesLogo: auctionSetup.seriesLogo,
        teamCount: auctionSetup.teamCount,
        unifiedBasePrice: auctionSetup.unifiedBasePrice,
        minPlayersPerTeam: auctionSetup.minPlayersPerTeam,
        initialPrize: auctionSetup.initialPrize,
        teams: auctionSetup.teams.map(t=> ({ id: t.id, name: t.name, budget: t.budget, owner: t.owner, logo: t.logo })),
        players: auctionSetup.players.map(p=> ({ id: p.id, name: p.name, specialization: p.specialization, photo: p.photo })),
        started: false,
      } as any)
    } catch(e){ console.warn('Immediate persist failed', e) }
  }

  const nextStep = () => {
    if (currentStep < 6) {
      // force save when leaving player step (4) to avoid stale removed players
      if(currentStep === 4) immediatePersist()
      setCurrentStep(currentStep + 1)
      setAuctionSetup(prev => ({ ...prev, currentStep: currentStep + 1 }))
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setAuctionSetup(prev => ({ ...prev, currentStep: currentStep - 1 }))
    }
  }

  const saveToLocalStorage = () => {
    localStorage.setItem('cricketAuctionSetup', JSON.stringify(auctionSetup))
  }

  const isStepComplete = (stepId:number) => {
    if(stepId >= currentStep) return false // only steps before current are considered complete
    switch(stepId){
      case 1: return auctionSetup.seriesName.trim().length>0
      case 2: return auctionSetup.teamCount >=2 && auctionSetup.teamCount <=12
      case 3: return auctionSetup.teams.length === auctionSetup.teamCount && auctionSetup.teams.every(t=>t.name.trim())
      case 4: return auctionSetup.players.length >= 1 // relaxed: only need at least one player now
      case 5: return auctionSetup.initialPrize >= 500000 && (auctionSetup.unifiedBasePrice||0) > 0
      default: return false
    }
  }
  // remove old completedCount; compute prep progress
  const prepStepTotal = stepperSteps.length - 1 // exclude final launch step
  const completedPrep = stepperSteps.filter(s=> s.id <= prepStepTotal && isStepComplete(s.id)).length
  const progress = Math.min(((completedPrep)/prepStepTotal)*100, 100)

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return auctionSetup.seriesName.trim().length > 0
      case 2:
        return auctionSetup.teamCount >= 2 && auctionSetup.teamCount <= 12
      case 3:
        return auctionSetup.teams.length === auctionSetup.teamCount && auctionSetup.teams.every(t=>t.name.trim())
      case 4:
        return auctionSetup.players.length >= 1 // relaxed condition
      case 5:
        return auctionSetup.initialPrize >= 500000 && (auctionSetup.unifiedBasePrice||0) > 0
      default:
        return true
    }
  }

  const handleSeriesLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if(!file) return
    const reader = new FileReader()
    reader.onload = () => setAuctionSetup(p=> ({...p, seriesLogo: reader.result as string }))
    reader.readAsDataURL(file)
  }
  const handleTeamLogo = (idx:number, file?:File) => {
    if(!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setAuctionSetup(p=> {
        const copy = [...p.teams]
        copy[idx] = { id: idx+1, budget: p.initialPrize, color: 'bg-primary/20', name: copy[idx]?.name||'', owner: copy[idx]?.owner||'', logo: reader.result as string }
        return { ...p, teams: copy }
      })
    }
    reader.readAsDataURL(file)
  }

  const handleStartAuction = async () => {
    if(starting) return
    setStarting(true)
    try {
      saveToLocalStorage()
      immediatePersist() // flush latest state first
      if(userId){
        const cleanTeams = auctionSetup.teams.map(t=> ({ id: t.id, name: t.name, budget: t.budget, owner: t.owner, logo: t.logo }))
        const cleanPlayers = auctionSetup.players.map(p=> ({ id: p.id, name: p.name, specialization: p.specialization, photo: p.photo }))
        await upsert({
          userId,
          step: 6,
          started: false,
          seriesName: auctionSetup.seriesName,
          seriesLogo: auctionSetup.seriesLogo,
          teamCount: auctionSetup.teamCount,
          unifiedBasePrice: auctionSetup.unifiedBasePrice,
          minPlayersPerTeam: auctionSetup.minPlayersPerTeam,
          initialPrize: auctionSetup.initialPrize,
          teams: cleanTeams,
          players: cleanPlayers,
          currentIndex: undefined,
          currentBid: undefined,
          highestBidTeamId: undefined,
          bidStep: undefined,
          recentBids: []
        } as any)
      }
      window.location.href = '/auction-live'
    } catch(e){
      console.warn('Final save failed', e)
      setStarting(false)
    }
  }

  const handleReset = async () => {
    try {
      if(userId) await clearSession({ userId } as any)
    } catch(e){ console.warn('Failed to clear remote session', e) }
    try { localStorage.removeItem('cricketAuctionSetup') } catch(_) {}
    setAuctionSetup({
      seriesName: '',
      teamCount: 4,
      teams: [],
      players: [],
      initialPrize: 1000000,
      currentStep: 1,
      minPlayersPerTeam: 11,
      unifiedBasePrice: 50000,
      playerInputMode: 'manual',
      lastUploadFileName: ''
    })
    setCurrentStep(1)
    hydratedRef.current = false
    setShowResetConfirm(false)
  }

  return (
    <div className="space-y-10">{/* increased vertical rhythm */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">{/* larger gap */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auction Setup</h1>{/* larger */}
          <p className="text-base text-muted-foreground mt-1">Step {currentStep} of {stepperSteps.length}</p>
        </div>
        <div className="flex flex-col md:items-end gap-4 md:flex-row md:gap-6 md:justify-end w-full md:w-auto">
          <div className="text-sm text-muted-foreground max-w-xl md:text-right leading-relaxed flex-1">
            Configure your custom auction in a guided 6-step flow. Define the series identity, set teams, load players, tune budgets, then launch instantly.
          </div>
          <Button variant="destructive" size="sm" onClick={()=> setShowResetConfirm(true)}>Reset Auction</Button>
        </div>
      </div>
      <Button variant="outline" asChild className="hidden"><Link href="/">Home</Link></Button>

      <div className="space-y-6">{/* stepper wrapper larger spacing */}
        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[4px] bg-border/70 rounded-full" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[4px] bg-primary rounded-full transition-all" style={{width: progress+'%'}} />
          <div className="flex gap-6 overflow-x-auto pb-4 pt-3 relative">
            {stepperSteps.map(step => {
              const Icon = step.icon
              const complete = isStepComplete(step.id)
              const active = currentStep === step.id
              let titleColor = 'text-muted-foreground'
              if (active || complete) titleColor = 'text-foreground'
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={()=>{ if(step.id <= currentStep || complete) setCurrentStep(step.id) }}
                  className="group relative flex flex-col items-center min-w-[110px] md:min-w-[140px] focus:outline-none"
                >
                  <span className={[
                    'flex h-12 w-12 items-center justify-center rounded-full border text-sm font-medium transition-all',
                    complete && !active && 'bg-primary text-primary-foreground border-primary shadow',
                    active && 'ring-4 ring-primary/25 bg-primary text-primary-foreground border-primary shadow',
                    !complete && !active && 'bg-muted text-muted-foreground'
                  ].join(' ')}>
                    {complete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </span>
                  <span className={`mt-2 text-xs font-semibold tracking-tight ${titleColor}`}>{step.title}</span>
                  <span className="hidden xl:block text-[11px] text-muted-foreground max-w-[160px] mt-1 line-clamp-1">{step.description}</span>
                  {active && <span className="absolute -bottom-2 h-2 w-2 rounded-full bg-primary" />}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground font-medium">
          <span>Preparation: {completedPrep}/{prepStepTotal} steps</span>
          <span className="hidden md:inline">Progress: {Math.round(progress)}%</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{stepperSteps.find(s => s.id === currentStep)?.title}</CardTitle>
          <CardDescription>{stepperSteps.find(s => s.id === currentStep)?.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} transition={{duration:0.25}}>
              {currentStep === 1 && (
                <div className="space-y-6 max-w-md">{/* series name + logo */}
                  <div className="grid gap-1">
                    <Label htmlFor="seriesName">Series Name</Label>
                    <Input id="seriesName" value={auctionSetup.seriesName} placeholder="Premier Cricket League 2025" onChange={e=> setAuctionSetup(p=>({...p, seriesName:e.target.value}))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="seriesLogo">Series Logo</Label>
                    <div className="flex items-center gap-4">
                      {auctionSetup.seriesLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={auctionSetup.seriesLogo} alt="Series logo" className="h-16 w-16 rounded-md object-cover border" />
                      ) : (
                        <div className="h-16 w-16 rounded-md border flex items-center justify-center text-[11px] text-muted-foreground">Logo</div>
                      )}
                      <div className="flex-1">
                        <Input id="seriesLogo" type="file" accept="image/*" onChange={handleSeriesLogo} className="h-9" />
                        <p className="text-[10px] text-muted-foreground mt-1">PNG/JPG/SVG. Square 256x256+ recommended.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-4 max-w-sm">
                  <Label htmlFor="teamCount">Team Count: {auctionSetup.teamCount}</Label>
                  <Input id="teamCount" type="range" min={2} max={12} value={auctionSetup.teamCount} onChange={e=> setAuctionSetup(p=>({...p, teamCount: parseInt(e.target.value), teams: [] }))} />
                  <p className="text-xs text-muted-foreground">Adjust number of teams (changing resets team list).</p>
                </div>
              )}
              {currentStep === 3 && (
                <div className="space-y-6">{/* increased spacing */}
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{/* wider gaps */}
                    {Array.from({length: auctionSetup.teamCount}, (_, i)=> auctionSetup.teams[i] || { id: i+1, name: '', budget: auctionSetup.initialPrize, color: 'bg-primary/20', owner: '', logo: undefined}).map((team, idx)=> (
                      <div key={team.id || `team-${idx}`} className="rounded-xl border p-5 space-y-5 bg-muted/5 hover:bg-muted/10 transition-colors shadow-sm">
                        <div className="flex flex-col items-center gap-3">
                          {team.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={team.logo} alt={team.name||`Team ${idx+1}`} className="h-20 w-20 rounded-full object-cover border shadow" />
                          ) : (
                            <div className="h-20 w-20 rounded-full border flex items-center justify-center text-xs text-muted-foreground">Logo</div>
                          )}
                          <Input type="file" accept="image/*" id={`team-logo-${idx}`} className="h-9 text-xs" onChange={e=> handleTeamLogo(idx, e.target.files?.[0])} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`team-name-${idx}`} className="text-xs font-semibold">Team {idx+1} Name</Label>
                          <Input id={`team-name-${idx}`} value={team.name} className="text-sm h-10" onChange={e=> {
                            const copy = [...auctionSetup.teams]
                            copy[idx] = { ...(copy[idx]|| team), name: e.target.value }
                            setAuctionSetup(p=> ({...p, teams: copy}))
                          }} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`team-owner-${idx}`} className="text-xs font-semibold">Owner</Label>
                          <Input id={`team-owner-${idx}`} value={team.owner||''} className="text-sm h-10" onChange={e=> {
                            const copy = [...auctionSetup.teams]
                            copy[idx] = { ...(copy[idx]|| team), owner: e.target.value }
                            setAuctionSetup(p=> ({...p, teams: copy}))
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Add team logos (optional), then names & owners.</p>
                </div>
              )}
              {currentStep === 4 && (
                <PlayerInfoStepShad auctionSetup={auctionSetup} setAuctionSetup={setAuctionSetup} />
              )}
              {currentStep === 5 && (
                <div className="space-y-4 max-w-md">
                  <Label htmlFor="budget">Team Budget (₹{auctionSetup.initialPrize.toLocaleString()})</Label>
                  <Input id="budget" type="range" min={500000} max={5000000} step={100000} value={auctionSetup.initialPrize} onChange={e=> setAuctionSetup(p=> ({...p, initialPrize: parseInt(e.target.value), teams: p.teams.map(t=>({...t, budget: parseInt(e.target.value)})) }))} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-1">
                      <Label htmlFor="minPlayers">Min Players / Team</Label>
                      <Input id="minPlayers" type="number" min={1} value={auctionSetup.minPlayersPerTeam} onChange={e=> setAuctionSetup(p=> ({...p, minPlayersPerTeam: parseInt(e.target.value)||0}))} />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="basePrice">Unified Base Price / Player (₹)</Label>
                      <Input id="basePrice" type="number" min={0} value={auctionSetup.unifiedBasePrice} onChange={e=> setAuctionSetup(p=> ({...p, unifiedBasePrice: parseInt(e.target.value)||0}))} />
                    </div>
                  </div>
                  <div className="rounded-md border p-4 text-sm space-y-1">
                    <div className="flex justify-between"><span>Teams</span><span>{auctionSetup.teamCount}</span></div>
                    <div className="flex justify-between"><span>Players Added</span><span>{auctionSetup.players.length}</span></div>
                    <div className="flex justify-between"><span>Min / Team</span><span>{auctionSetup.minPlayersPerTeam}</span></div>
                    <div className="flex justify-between"><span>Unified Base Price</span><span>₹{(auctionSetup.unifiedBasePrice||0).toLocaleString()}</span></div>
                    <div className="flex justify-between font-medium"><span>Total Auction Value</span><span>₹{(auctionSetup.initialPrize * auctionSetup.teamCount).toLocaleString()}</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Configure budgets and minimum squad size. Unsold re-auction handled dynamically during auction.</p>
                </div>
              )}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between"><span>Series</span><span>{auctionSetup.seriesName}</span></div>
                    <div className="flex justify-between"><span>Teams</span><span>{auctionSetup.teamCount}</span></div>
                    <div className="flex justify-between"><span>Players</span><span>{auctionSetup.players.length}</span></div>
                    <div className="flex justify-between"><span>Budget / Team</span><span>₹{auctionSetup.initialPrize.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Unified Base Price</span><span>₹{(auctionSetup.unifiedBasePrice||0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Min Players / Team</span><span>{auctionSetup.minPlayersPerTeam}</span></div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" disabled={currentStep===1} onClick={prevStep}>Back</Button>
          {currentStep < 6 ? (
            <Button onClick={nextStep} disabled={!canGoNext()}>Next</Button>
          ) : (
            <Button onClick={handleStartAuction} disabled={starting}>{starting? 'Starting...' : 'Start Auction'}</Button>
          )}
        </CardFooter>
      </Card>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-md border bg-background p-5 space-y-4 shadow-lg animate-in fade-in zoom-in-95">
            <h4 className="text-sm font-semibold">Reset Auction Setup</h4>
            <p className="text-xs text-muted-foreground">This will delete all saved setup data (local & remote) and start over. This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={()=> setShowResetConfirm(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleReset}>Reset</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Shadcn player info step
function PlayerInfoStepShad({ auctionSetup, setAuctionSetup }: Readonly<{ auctionSetup: AuctionSetup; setAuctionSetup: React.Dispatch<React.SetStateAction<AuctionSetup>> }>) {
  const [draft, setDraft] = useState({ name: '', specialization: 'Batsman' as Player['specialization'] })
  const [uploading, setUploading] = useState(false)
  const mode = auctionSetup.playerInputMode || 'manual'
  const setMode = (m: 'manual' | 'excel') => setAuctionSetup(p=> ({...p, playerInputMode: m}))
  const [parseProgress, setParseProgress] = useState<{ processed:number; total:number; extracted:number }|null>(null)
  const [parseError, setParseError] = useState<string|null>(null)
  const [parseSummary, setParseSummary] = useState<string|null>(null)
  const [search, setSearch] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Player|null>(null)
  const [pendingClearAll, setPendingClearAll] = useState(false)
  const fileInputRef = useRef<HTMLInputElement|null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // helper: safe string conversion to avoid implicit object stringification
  const safeString = (val: unknown): string => {
    if (typeof val === 'string') return val
    if (typeof val === 'number' || typeof val === 'boolean') return String(val)
    return ''
  }
  // helper: determine specialization from a raw role string
  const roleToSpecialization = (roleVal: unknown): Player['specialization'] => {
    const roleLower = safeString(roleVal).toLowerCase()
    if(roleLower.includes('bowl')) return 'Bowler'
    if(roleLower.includes('all')) return 'All-rounder'
    if(roleLower.includes('wicket') || roleLower.includes('keeper')) return 'Wicket-keeper'
    return 'Batsman'
  }
  // helper: normalize object keys (trim + lower) for easier lookup
  const normalizeRow = (row:any) => {
    const norm: Record<string, any> = {}
    Object.keys(row||{}).forEach(k=> { norm[k.trim().toLowerCase()] = row[k] })
    return norm
  }
  // helper: process rows with progress + duplicate detection
  const processRows = async (json:any[], existingNames:Set<string>) => {
    const nameCandidates = ['name','player','playername','player name']
    const roleCandidates = ['role','specialization','type','players specification','player specification','playerspecification']
    const photoCandidates = ['photo','player latest photo','player photo','image','img','picture','latest photo']
    const rows: Player[] = []
    let duplicates = 0
    const total = json.length
    const CHUNK = 25
    for (let idx=0; idx<json.length; idx++) {
      const norm = normalizeRow(json[idx])
      const nameVal = nameCandidates.map(c=> safeString(norm[c])).find(v=> v)
      const roleVal = roleCandidates.map(c=> safeString(norm[c])).find(v=> v) || ''
      const photoVal = photoCandidates.map(c=> safeString(norm[c])).find(v=> v) || ''
      const name = safeString(nameVal).replace(/\s+/g,' ').trim()
      if(name){
        const lower = name.toLowerCase()
        const already = existingNames.has(lower) || rows.some(r=> r.name.toLowerCase()===lower)
        if(already) duplicates++
        else rows.push({ id: Date.now() + idx, name, specialization: roleToSpecialization(roleVal), photo: photoVal.trim() || undefined })
      }
      const processed = idx + 1
      if(processed % CHUNK === 0 || processed === total) {
        setParseProgress({ processed, total, extracted: rows.length })
        await new Promise(r=> setTimeout(r, 0)) // yield to UI
      }
    }
    return { rows, duplicates, total }
  }

  const fileHandler = async (file: File) => {
    setUploading(true)
    setParseProgress({ processed: 0, total: 0, extracted: 0 })
    setParseError(null)
    setParseSummary(null)
    try {
      const XLSX: any = await import('xlsx')
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      if(!sheet){ setParseError('No worksheet detected in file.'); return }
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      if(!json.length){ setParseError('Sheet is empty or headers not recognized.'); return }
      setParseProgress({ processed: 0, total: json.length, extracted: 0 })

      const existingNames = new Set(auctionSetup.players.map(p=> p.name.toLowerCase()))
      const { rows, duplicates } = await processRows(json, existingNames)

      if(rows.length){
        setAuctionSetup(p=> ({...p, players: [...p.players, ...rows] }))
        let msg = `Imported ${rows.length} player${rows.length!==1 ? 's' : ''}`
        if(duplicates){
          msg += ` • ${duplicates} duplicate${duplicates!==1 ? 's' : ''} skipped`
        }
        setParseSummary(msg)
      } else {
        setParseError('No players extracted. Verify header names or data content.')
      }
    } catch (e:any) {
      console.error(e)
      setParseError('Failed to parse file: ' + (e?.message || 'Unknown error'))
    } finally {
      setUploading(false)
      if(!parseError){ setTimeout(()=> { setParseProgress(null) }, 2000) }
    }
  }
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if(file){
      setAuctionSetup(p=> ({...p, lastUploadFileName: file.name }))
      fileHandler(file)
    }
  }
  const add = () => {
    if (!draft.name.trim()) return
    const cleaned = draft.name.replace(/\s+/g,' ').trim()
    setAuctionSetup(p=> ({...p, players: [...p.players, { id: Date.now(), name: cleaned, specialization: draft.specialization }]}))
    setDraft({ name: '', specialization: 'Batsman' })
  }
  const clearAll = () => {
    if(!auctionSetup.players.length) return
    // show custom modal instead of native confirm
    setPendingClearAll(true)
  }
  const executeClearAll = () => {
    setAuctionSetup(p=> ({...p, players: [], lastUploadFileName: ''}))
    setParseSummary('Cleared player list.')
    setParseError(null)
    setParseProgress(null)
    if(fileInputRef.current) fileInputRef.current.value = ''
    setPendingClearAll(false)
  }
  const remove = (id:number) => { setAuctionSetup(p=> ({...p, players: p.players.filter(pl=> pl.id!==id)})); setSelectedIds(s=> { const n = new Set(s); n.delete(id); return n }) }
  const toggleSelected = (id:number) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const removeSelected = () => {
    if(!selectedIds.size) return
    setAuctionSetup(p=> ({...p, players: p.players.filter(pl=> !selectedIds.has(pl.id))}))
    setSelectedIds(new Set())
  }
  const clearSelection = () => setSelectedIds(new Set())
  const filteredPlayers = search.trim() ? auctionSetup.players.filter(pl => (
    pl.name.toLowerCase().includes(search.toLowerCase()) || pl.specialization.toLowerCase().includes(search.toLowerCase())
  )) : auctionSetup.players
  const allFilteredSelected = filteredPlayers.length>0 && filteredPlayers.every(pl=> selectedIds.has(pl.id))
  const toggleSelectAllFiltered = () => {
    setSelectedIds(prev => {
      if(allFilteredSelected){
        const next = new Set(prev); filteredPlayers.forEach(pl=> next.delete(pl.id)); return next
      }
      const next = new Set(prev); filteredPlayers.forEach(pl=> next.add(pl.id)); return next
    })
  }
  const hasPhotos = filteredPlayers.some(p=> p.photo)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium">Input Mode:</span>
        <button type="button" onClick={()=> setMode('manual')} className={`px-3 py-1 rounded-md border text-[11px] ${mode==='manual' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>Manual</button>
        <button type="button" onClick={()=> setMode('excel')} className={`px-3 py-1 rounded-md border text-[11px] ${mode==='excel' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>Excel Upload</button>
      </div>
      {mode === 'manual' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="grid gap-1"><Label htmlFor="p-name">Name</Label><Input id="p-name" value={draft.name} onChange={e=> setDraft(d=> ({...d, name: e.target.value}))} placeholder="Player name" /></div>
          <div className="grid gap-1"><Label htmlFor="p-spec">Specialization</Label>
            <select id="p-spec" value={draft.specialization} onChange={e=> setDraft(d=> ({...d, specialization: e.target.value as Player['specialization']}))} className="h-10 rounded-md border bg-background px-3 text-sm text-foreground">
              <option value="Batsman">Batsman</option>
              <option value="Bowler">Bowler</option>
              <option value="All-rounder">All-rounder</option>
              <option value="Wicket-keeper">Wicket-keeper</option>
            </select>
          </div>
          <Button onClick={add} disabled={!draft.name.trim()} className="md:col-span-1">Add</Button>
        </div>
      )}
      {mode === 'excel' && (
        <div className="space-y-3">
          <div className="grid gap-1 max-w-sm">
            <Label htmlFor="file-upload">Excel File (.xlsx / .xls)</Label>
            <Input id="file-upload" type="file" accept=".xlsx,.xls" onChange={onFileChange} ref={fileInputRef} />
            {auctionSetup.lastUploadFileName && !uploading && (
              <p className="text-[11px] text-muted-foreground">Last uploaded: <span className="font-medium text-foreground">{auctionSetup.lastUploadFileName}</span></p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Columns detected automatically (case & space insensitive). Name headers: Name, Player, Player Name. Role headers: Role, Specialization, Type, Players Specification. Duplicates skipped.</p>
          {uploading && parseProgress && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="animate-pulse">Parsing {parseProgress.processed}/{parseProgress.total} rows • Extracted {parseProgress.extracted}</p>
              <div className="h-1 w-full bg-muted rounded overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{width: `${parseProgress.total? Math.min(100, (parseProgress.processed/parseProgress.total)*100) : 5}%`}} />
              </div>
            </div>
          )}
          {!uploading && parseSummary && !parseError && (
            <p className="text-[11px] text-green-500/80">{parseSummary}</p>
          )}
          {parseError && (
            <p className="text-[11px] text-red-500">{parseError}</p>
          )}
        </div>
      )}
      {auctionSetup.players.length > 0 && (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs">
          <Input placeholder="Search players..." value={search} onChange={e=> setSearch(e.target.value)} className="h-8 md:w-64" />
          <div className="flex flex-wrap gap-2 items-center">
            {selectedIds.size>0 && <span className="text-[11px] text-muted-foreground">Selected: {selectedIds.size}</span>}
            {selectedIds.size>0 && <Button variant="secondary" size="sm" onClick={clearSelection}>Clear Selection</Button>}
            <Button size="sm" variant="outline" onClick={removeSelected} disabled={!selectedIds.size}>Remove Selected</Button>
            {search && <Button variant="outline" size="sm" onClick={()=> setSearch('')}>Clear Search</Button>}
            <Button variant="destructive" size="sm" onClick={clearAll} disabled={!auctionSetup.players.length}>Remove All</Button>
          </div>
        </div>
      )}
      <div className={`rounded-md border overflow-y-auto player-scroll relative ${auctionSetup.players.length ? 'max-h-96 min-h-[360px]' : 'h-32'}`}>{/* conditional height */}
        {auctionSetup.players.length > 0 && (
          <div className={[hasPhotos ? 'grid grid-cols-[38px_40px_1fr_160px_90px]' : 'grid grid-cols-[38px_1fr_160px_90px]','px-3 py-1 text-[11px] font-semibold sticky top-0 z-20 bg-background/95 backdrop-blur-sm shadow-sm'].join(' ')}>{/* dynamic columns */}
            <button type="button" onClick={toggleSelectAllFiltered} className="flex items-center justify-center gap-1 text-[10px] font-medium">
              <input type="checkbox" className="h-3.5 w-3.5" checked={allFilteredSelected} readOnly />
              <span className="w-4 text-center opacity-70">#</span>
            </button>
            {hasPhotos && <span className="text-center" />}
            <span>Player Name</span>
            <span className="text-center">Players Specification</span>
            <span className="text-right">Action</span>
          </div>
        )}
        {filteredPlayers.map((pl, i)=> {
          const rowIndex = i + 1 // index in filtered view
          return (
            <div key={pl.id} className={[hasPhotos ? 'grid grid-cols-[38px_40px_1fr_160px_90px]' : 'grid grid-cols-[38px_1fr_160px_90px]','items-center px-3 py-2 text-sm border-t'].join(' ')}>
              <div className="flex items-center justify-center gap-1">
                <input type="checkbox" className="h-3.5 w-3.5" checked={selectedIds.has(pl.id)} onChange={()=> toggleSelected(pl.id)} />
                <span className="text-[10px] opacity-70 w-4 text-center">{rowIndex}</span>
              </div>
              {hasPhotos && (
                <div className="flex items-center justify-center">
                  {pl.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pl.photo} alt={pl.name} className="h-8 w-8 rounded-full object-cover border" onError={(e)=>{ (e.currentTarget as HTMLImageElement).src='/player-placeholder.svg' }} />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                      {pl.name.split(' ').slice(0,2).map(s=> s[0]).join('').toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              <span className="truncate" title={pl.name}>{pl.name}</span>
              <span className="text-xs text-muted-foreground text-center">{pl.specialization}</span>
              <div className="flex items-center justify-end gap-1">
                <Button variant="destructive" size="sm" onClick={()=> setPendingDelete(pl)}>✕</Button>
              </div>
            </div>
          )
        })}
        {auctionSetup.players.length===0 && <p className="p-4 text-xs text-muted-foreground">No players added.</p>}
        {auctionSetup.players.length>0 && filteredPlayers.length===0 && <p className="p-4 text-xs text-muted-foreground">No players match your search.</p>}
      </div>
      <p className="text-xs text-muted-foreground">Players added: {auctionSetup.players.length}{filteredPlayers.length!==auctionSetup.players.length && ` • Showing ${filteredPlayers.length}`}</p>
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-md border bg-background p-5 space-y-4 shadow-lg animate-in fade-in zoom-in-95">
            <h4 className="text-sm font-semibold">Remove Player</h4>
            <p className="text-xs text-muted-foreground">Are you sure you want to remove <span className="font-medium">{pendingDelete.name}</span> from the list?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={()=> setPendingDelete(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={()=> { remove(pendingDelete.id); setPendingDelete(null) }}>Remove</Button>
            </div>
          </div>
        </div>
      )}
      {pendingClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-md border bg-background p-5 space-y-4 shadow-lg animate-in fade-in zoom-in-95">
            <h4 className="text-sm font-semibold">Remove All Players</h4>
            <p className="text-xs text-muted-foreground">This will permanently remove all <span className="font-medium">{auctionSetup.players.length}</span> players from the current list. This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={()=> setPendingClearAll(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={executeClearAll}>Remove All</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
