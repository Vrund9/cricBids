'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-24 border-b">
        <div className="max-w-6xl mx-auto px-4 grid gap-16 md:grid-cols-2 items-center">
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:.6 }} className="space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="px-3 py-1">Next Gen Platform</Badge>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                Run Your Own <span className="bg-gradient-to-r from-indigo-300 via-sky-200 to-emerald-200 bg-clip-text text-transparent">Cricket Auction</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Configure teams, upload players, and conduct live bidding in a fast, streamlined dark UI. Simple setup. Powerful results.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="px-8"><Link href="/auction-setup">Setup Auction</Link></Button>
              <Button asChild size="lg" variant="outline" className="px-8"><Link href="/auction-live">View Live Demo</Link></Button>
            </div>
            <p className="text-xs text-muted-foreground">No limits on player pool size • Flexible budgets • Instant results summary</p>
          </motion.div>
          <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:.15, duration:.6 }} className="relative">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon:'🛠️', title:'Guided Setup', desc:'6-step wizard validates data & budgets.' },
                { icon:'🎯', title:'Smart Rotation', desc:'Random next-player logic to keep suspense.' },
                { icon:'📡', title:'Manual Control', desc:'Decide sold / unsold & pacing.' },
                { icon:'📈', title:'Instant Summary', desc:'Budgets, purchases & unsold list.' }
              ].map(feature => (
                <Card key={feature.title} className="border border-muted/40 bg-muted/30 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><span>{feature.icon}</span>{feature.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed">{feature.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            {/* removed outer ring to eliminate perceived border grid */}
          </motion.div>
        </div>
      </section>

      {/* Cricket / Auction Pillars */}
      <section className="py-16 border-b">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-6">
          {[
            { icon:'🏏', title:'Player Roles', desc:'Track squad balance across roles in real time.' },
            { icon:'💰', title:'Dynamic Purse', desc:'Auto adjusts after each sale with avg spend & remaining per slot.' },
            { icon:'⏱️', title:'Manual Pace', desc:'You decide when to start, pause, sell or mark unsold.' },
            { icon:'🎲', title:'Random Picks', desc:'Smart random next-player draw keeps suspense high.' }
          ].map(p => (
            <Card key={p.title} className="border border-muted/40 bg-gradient-to-b from-muted/30 to-muted/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg"><span>{p.icon}</span>{p.title}</CardTitle>
                <CardDescription>{p.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Deeper Feature Grid */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight">Why Choose Us</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Everything you need to host a professional style cricket auction.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon:'📊', title:'Team Analytics', desc:'Budgets, composition ratios & spend summaries.' },
              { icon:'🧮', title:'Smart Increments', desc:'Automatic 25K / 50K steps based on current value.' },
              { icon:'🗂️', title:'Player Pool', desc:'Import / edit players with roles & base price.' },
              { icon:'🧾', title:'Result Ledger', desc:'Instant roster + unsold export overview.' },
              { icon:'🛡️', title:'Fair Control', desc:'Manual adjudication prevents accidental sells.' },
              { icon:'🚀', title:'Fast UI', desc:'Optimized dark interface for rapid pacing.' }
            ].map(f => (
              <Card key={f.title} className="relative overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl"><span className="text-2xl">{f.icon}</span>{f.title}</CardTitle>
                  <CardDescription>{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap / How It Works */}
      <section className="py-24 border-t">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold tracking-tight">6 Step Auction Roadmap</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">A quick journey from idea to live bidding. Every step validated before you move on.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute left-0 right-0 top-16 h-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="grid md:grid-cols-6 gap-6 relative">
              {[
                { n:1, title:'Series', desc:'Name & theme your league.' },
                { n:2, title:'Teams', desc:'Pick how many compete.' },
                { n:3, title:'Branding', desc:'Team names & owners.' },
                { n:4, title:'Players', desc:'Load player pool & roles.' },
                { n:5, title:'Budgets', desc:'Set purse & base logic.' },
                { n:6, title:'Launch', desc:'Review & go live.' },
              ].map(step=> (
                <div key={step.n} className="group flex flex-col items-center text-center relative">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full ring-2 ring-border bg-muted group-hover:bg-primary/10 transition font-semibold text-sm">
                    {step.n}
                  </div>
                  <p className="mt-3 text-sm font-medium tracking-tight">{step.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed max-w-[140px]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Auction Demo */}
      <section className="py-24 border-t bg-muted/10">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="secondary" className="px-3 py-1">Quick Auction</Badge>
            <h2 className="text-3xl font-bold tracking-tight">Experience a Demo Auction</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md">Jump into a pre-configured India vs Australia showcase with curated star players and budgets. See bidding, random player rotation, and live purse tracking without any setup.</p>
            <ul className="text-sm space-y-2">
              <li>• Pre-loaded squads & player pool</li>
              <li>• Real-time bid increments (25K / 50K)</li>
              <li>• Sold / Unsold flow & upcoming queue</li>
              <li>• Budget auto-adjust & value summaries</li>
            </ul>
            <div className="flex gap-4 pt-2">
              <Button asChild className="px-6"><Link href="/quick-auction">Launch Demo</Link></Button>
              <Button asChild variant="outline" className="px-6"><Link href="/pricing">Unlock Full Version</Link></Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Demo is read-only. Upgrade for full control.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon:'🇮🇳', title:'Team India Core', desc:'Balance of power hitters & pace.' },
              { icon:'🇦🇺', title:'Team Australia Core', desc:'Elite strike bowlers & all-rounders.' },
              { icon:'⚡', title:'Live Bidding UI', desc:'Dynamic purse & leader indicators.' },
              { icon:'📜', title:'Result Snapshot', desc:'Instant roster & spend overview.' },
            ].map(item => (
              <Card key={item.title} className="border border-muted/40 bg-muted/30 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><span>{item.icon}</span>{item.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{item.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
