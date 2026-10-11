'use client'
import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'

interface AuthUser { id: string; name: string; avatarUrl?: string }

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()
  const router = useRouter()
  const hideChrome = ['/login', '/signup', '/forgot-password'].includes(pathname)
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(()=>{
    const raw = typeof window !== 'undefined' ? localStorage.getItem('ca_user') : null
    if(raw){ try { const parsed = JSON.parse(raw); setUser(parsed) } catch{} }
  },[])

  React.useEffect(()=>{
    const sync = () => {
      const raw = localStorage.getItem('ca_user')
      if(raw){ try { setUser(JSON.parse(raw)) } catch{} } else { setUser(null) }
    }
    window.addEventListener('storage', sync)
    window.addEventListener('ca-auth-changed', sync as any)
    const interval = setInterval(sync, 2000)
    return ()=>{ window.removeEventListener('storage', sync); window.removeEventListener('ca-auth-changed', sync as any); clearInterval(interval) }
  },[])

  React.useEffect(()=>{
    if(user && hideChrome){
      router.replace('/')
    }
  },[user, hideChrome, router])

  const logout = () => {
    localStorage.removeItem('ca_user')
    setUser(null)
    setMenuOpen(false)
    router.push('/')
  }

  React.useEffect(()=>{
    if(!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if(menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if(e.key==='Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return ()=>{ document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  },[menuOpen])

  return (
    <div className="flex min-h-screen flex-col">
      {!hideChrome && (
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
            <Link href="/" className="font-semibold text-sm flex items-center gap-2">
              <span className="text-lg">🏏</span>
              <span>Cricket Auction</span>
            </Link>
            <nav className="ml-auto flex gap-5 text-xs sm:text-sm items-center relative">
              <Link href="/" className="text-muted-foreground hover:text-foreground hidden sm:inline">Home</Link>
              <Link href="/auction-live" className="text-muted-foreground hover:text-foreground">Live</Link>
              <Link href="/analytics" className="text-muted-foreground hover:text-foreground hidden md:inline">Analytics</Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground hidden md:inline">Pricing</Link>
              <Link href="/contact" className="text-muted-foreground hover:text-foreground hidden md:inline">Contact us</Link>
              {!user && (
                <>
                  <Link href="/login" className="text-muted-foreground hover:text-foreground">Login</Link>
                  <Link href="/signup" className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors">Sign Up</Link>
                </>
              )}
              {user && (
                <div className="relative">
                  <button type="button" onClick={()=>setMenuOpen(o=>!o)} className="flex items-center gap-2 rounded-full px-2 py-1.5 text-xs hover:bg-accent">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full object-cover ring-1 ring-border" />
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background ring-1 ring-border text-[11px] font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="hidden sm:inline max-w-[120px] truncate font-medium tracking-tight">{user.name}</span>
                  </button>
                  {menuOpen && (
                    <div ref={menuRef} className="absolute right-0 mt-2 w-48 rounded-md border bg-background shadow-lg text-xs py-1 z-[200]" style={{backgroundColor:'hsl(var(--background))'}}>
                      <Link href="/profile" onClick={()=>setMenuOpen(false)} className="block px-3 py-2 hover:bg-accent hover:text-accent-foreground">Profile</Link>
                      <Link href="/my-auctions" onClick={()=>setMenuOpen(false)} className="block px-3 py-2 hover:bg-accent hover:text-accent-foreground">My Auctions</Link>
                      <Link href="/change-password" onClick={()=>setMenuOpen(false)} className="block px-3 py-2 hover:bg-accent hover:text-accent-foreground">Change Password</Link>
                      <button onClick={logout} className="w-full text-left px-3 py-2 hover:bg-destructive/10 hover:text-destructive">Logout</button>
                    </div>
                  )}
                </div>
              )}
              <ThemeToggle />
            </nav>
          </div>
        </header>
      )}
      <main className="flex-1">
        {hideChrome ? children : (
          <div className="mx-auto w-full max-w-6xl p-4">
            {children}
          </div>
        )}
      </main>
      {!hideChrome && (
        <footer className="border-t text-xs text-muted-foreground py-10 mt-8">
          <div className="mx-auto max-w-6xl px-4 grid gap-8 md:grid-cols-3">
            <div className="space-y-2">
              <p className="font-medium text-foreground flex items-center gap-2"><span>🏏</span>Cricket Auction</p>
              <p className="leading-relaxed">Run franchise-style player auctions with live bidding, smart rotation, and instant summaries.</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Auction Flow</p>
              <ul className="space-y-1">
                <li><Link className="hover:text-foreground" href="/auction-setup">Setup Wizard</Link></li>
                <li><Link className="hover:text-foreground" href="/auction-live">Live Room</Link></li>
                <li><Link className="hover:text-foreground" href="/analytics">Analytics</Link></li>
                <li><Link className="hover:text-foreground" href="/pricing">Pricing</Link></li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Cricket Elements</p>
              <ul className="space-y-1">
                <li>Roles: Batsman • Bowler • All-rounder • Keeper</li>
                <li>Bid Steps: <span className="text-foreground">25K / 50K</span></li>
                <li>Formats: T10 • T20 • League • Friendly</li>
                <li>Metrics: Purse Left, Avg Spend, Role Balance</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t pt-4 mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>© {new Date().getFullYear()} Cricket Auction</span>
            <span className="text-muted-foreground">Crafted with Next.js & shadcn/ui</span>
          </div>
        </footer>
      )}
    </div>
  )
}
