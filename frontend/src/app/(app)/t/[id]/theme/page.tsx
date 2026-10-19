'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ExternalLink, ImagePlus, Loader2, Lock, MonitorPlay, Palette, RotateCcw, Save, Smartphone, Sparkles, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { useUpgrade } from '@/components/upgrade'
import { Button, Card, Switch } from '@/components/ui'
import { BACKGROUNDS, palette, THEMES, themeBackground, themeStyle, type ThemeConfig, type ThemePreset } from '@/lib/themes'
import { uploadImage } from '@/lib/api'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Quick brand colours; the picker covers anything else. */
const SWATCHES = ['#c8ff2e', '#22d3ee', '#5b8cff', '#a78bfa', '#ff4d6d', '#ff9933', '#ffd166', '#2ee59d']

type Screen = 'live' | 'register' | 'paddle'

export default function ThemePage() {
  const { t, update } = useTournament()
  const { openUpgrade } = useUpgrade()
  const saved: ThemeConfig = { preset: 'floodlight', ...(t.theme ?? {}) }
  const [theme, setTheme] = useState<ThemeConfig>(saved)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [screen, setScreen] = useState<Screen>('live')
  useEffect(() => setTheme({ preset: 'floodlight', ...(t.theme ?? {}) }), [t.theme])

  // Anyone can preview every look; saving anything beyond the default needs the theme add-on.
  const unlocked = t.planInfo.limits.customTheme
  const price = t.planInfo.pricing.themeUnlock
  const custom = theme.preset !== 'floodlight' || !!theme.accent || (theme.background ?? 'glow') !== 'glow'
  const needsUnlock = custom && !unlocked
  const dirty = JSON.stringify(theme) !== JSON.stringify(saved)
  const p = palette(theme)
  const set = (patch: Partial<ThemeConfig>) => setTheme((x) => ({ ...x, ...patch }))

  const save = async () => {
    if (needsUnlock) return openUpgrade(`Theme customisation is a ₹${price} add-on for this auction`)
    if (theme.background === 'image' && !theme.backgroundImage) return toast.error('Upload a background image first')
    setSaving(true)
    try {
      await update({
        theme: {
          preset: theme.preset,
          accent: theme.accent || undefined,
          hideBranding: theme.hideBranding || undefined,
          background: theme.background && theme.background !== 'glow' ? theme.background : undefined,
          backgroundImage: theme.background === 'image' ? theme.backgroundImage : undefined,
        },
      })
      toast.success('Theme saved — live screens update instantly')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const upload = async (f: File) => {
    setUploading(true)
    try {
      const url = await uploadImage(f)
      set({ background: 'image', backgroundImage: url })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Screen theme</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-400">How the big screen, registration form and team paddles look. Changes reach every open screen in realtime.</p>
        </div>
        {unlocked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-glow/10 px-3 py-1.5 text-xs font-semibold text-lime-glow"><Sparkles className="h-3.5 w-3.5" /> Custom themes unlocked</span>
        ) : (
          <button onClick={() => openUpgrade(`Theme customisation is a ₹${price} add-on for this auction`)} className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/15">
            <Lock className="h-3.5 w-3.5" /> Preview free · save for ₹{price}
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="min-w-0 space-y-6">
          {/* 1 · Colours */}
          <Section n={1} title="Colour theme" hint="Sets the accent, gold and highlight colours.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(Object.keys(THEMES) as ThemePreset[]).map((key) => {
                const pal = THEMES[key]
                const active = theme.preset === key
                return (
                  <motion.button
                    key={key}
                    whileHover={{ y: -3 }}
                    onClick={() => set({ preset: key })}
                    aria-pressed={active}
                    className={cn('tile relative overflow-hidden rounded-2xl border-2 text-left', !active && 'border-transparent')}
                    style={{ borderColor: active ? pal.accent : undefined }}
                  >
                    <div className="h-16 p-3" style={{ background: `radial-gradient(120px 60px at 85% 0%, ${pal.accent}55, transparent 70%), radial-gradient(120px 60px at 0% 100%, ${pal.second}33, transparent 70%), ${pal.ink[1]}` }}>
                      <div className="flex gap-1">
                        {[pal.accent, pal.gold, pal.second].map((c) => <span key={c} className="h-3.5 w-3.5 rounded-full ring-2 ring-black/20" style={{ background: c }} />)}
                      </div>
                      <p className="mt-2 font-display text-lg font-black leading-none" style={{ color: pal.gold }}>₹1.2L</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] bg-ink-850 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{pal.name}</p>
                        <p className="truncate text-[11px] text-ink-400">{pal.vibe}</p>
                      </div>
                      {active && <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: pal.accent }}><Check className="h-3 w-3 text-black" /></span>}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </Section>

          {/* 2 · Background */}
          <Section n={2} title="Background" hint="The backdrop behind every screen. Images are darkened so text stays readable.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BACKGROUNDS.map((b) => {
                const active = (theme.background ?? 'glow') === b.id
                return (
                  <button key={b.id} onClick={() => set({ background: b.id })} aria-pressed={active} className={cn('tile group overflow-hidden rounded-2xl border-2 text-left transition hover:-translate-y-0.5', active ? 'border-lime-glow' : 'border-transparent')}>
                    <div className="relative grid h-20 place-items-center overflow-hidden">
                      {/* Painted at screen size and scaled down, so beams, stripes and stars read like they do on the big screen. */}
                      <div className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-[0.25]" style={{ background: themeBackground({ ...theme, background: b.id }, p) }} />
                      {b.id === 'image' && !theme.backgroundImage && <ImagePlus className="h-5 w-5 text-white/60" />}
                      {active && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-lime-bright text-on-accent"><Check className="h-3 w-3" /></span>}
                    </div>
                    <div className="border-t border-[var(--border)] px-3 py-2">
                      <p className="text-sm font-semibold">{b.name}</p>
                      <p className="truncate text-[11px] text-ink-400">{b.vibe}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <AnimatePresence initial={false}>
              {theme.background === 'image' && (
                <motion.label
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 flex cursor-pointer items-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed border-[var(--border-strong)] p-4 hover:border-lime-glow/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const f = e.dataTransfer.files?.[0]
                    if (f) void upload(f)
                  }}
                >
                  <div className="h-16 w-28 shrink-0 rounded-xl border border-white/10" style={{ background: themeBackground({ ...theme, background: 'image' }, p) }} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      {uploading ? 'Uploading…' : theme.backgroundImage ? 'Change image' : 'Upload or drop a background image'}
                    </p>
                    <p className="text-xs text-ink-400">A ground photo or tournament poster works best (landscape, under 5 MB).</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f) }} />
                </motion.label>
              )}
            </AnimatePresence>
          </Section>

          {/* 3 · Brand */}
          <Section n={3} title="Brand colour & branding" hint="Your own accent overrides the theme’s — buttons, highlights and the live dot use it.">
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => {
                const active = (theme.accent ?? '').toLowerCase() === c
                return (
                  <button key={c} onClick={() => set({ accent: c })} aria-label={`Accent ${c}`} aria-pressed={active} className={cn('grid h-9 w-9 place-items-center rounded-xl shadow-sm ring-1 ring-inset ring-black/10 transition hover:scale-110', active && 'ring-2 ring-white/70 ring-offset-2 ring-offset-ink-850')} style={{ background: c }}>
                    {active && <Check className="h-4 w-4 text-black" />}
                  </button>
                )
              })}
              <label className="relative grid h-9 cursor-pointer place-items-center rounded-xl border border-[var(--border-strong)] px-3 text-xs font-semibold hover:bg-white/5">
                <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-md border border-white/20" style={{ background: p.accent }} /> Custom</span>
                <input type="color" value={theme.accent || THEMES[theme.preset].accent} onChange={(e) => set({ accent: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Pick any brand colour" />
              </label>
              {theme.accent && (
                <button onClick={() => set({ accent: undefined })} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs text-ink-300 hover:bg-white/5 hover:text-white">
                  <RotateCcw className="h-3.5 w-3.5" /> Use theme colour
                </button>
              )}
            </div>
            <div className="my-5 h-px bg-[var(--border)]" />
            <Switch checked={!!theme.hideBranding} onChange={(v) => set({ hideBranding: v })} label="Remove “Powered by BidWicket”" description="White-label the live screen and registration form. Free on every auction." />
          </Section>
        </div>

        {/* Preview */}
        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Live preview</p>
            <div className="flex rounded-xl border border-[var(--border-strong)] bg-ink-850 p-1 shadow-sm" role="tablist" aria-label="Preview screen">
              {([['live', MonitorPlay, 'Big screen'], ['register', ClipboardList, 'Form'], ['paddle', Smartphone, 'Paddle']] as const).map(([id, Icon, label]) => (
                <button key={id} role="tab" aria-selected={screen === id} onClick={() => setScreen(id)} className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors', screen === id ? 'bg-lime-glow/12 text-lime-glow' : 'text-ink-400 hover:text-white')}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-[var(--border-strong)] bg-ink-700 px-4 py-2.5">
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}
              <span className="ml-3 truncate rounded-md bg-ink-850 px-2 py-0.5 font-mono text-[10px] text-ink-300 ring-1 ring-[var(--border)]">bidwicket.app/{screen === 'live' ? 'live' : screen === 'register' ? 'register' : 'bid'}/…</span>
            </div>
            <motion.div key={`${screen}${theme.preset}${theme.accent}${theme.background}${theme.backgroundImage}`} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="min-h-[440px] p-5" style={themeStyle(theme)}>
              {screen === 'live' && <LivePreview name={t.name} currency={t.currency} />}
              {screen === 'register' && <RegisterPreview name={t.name} />}
              {screen === 'paddle' && <PaddlePreview currency={t.currency} />}
              {!theme.hideBranding && <p className="mt-4 text-center text-[10px] text-ink-400">Powered by BidWicket</p>}
            </motion.div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`/live/${t.liveToken}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-ink-850 px-3 text-xs font-semibold shadow-sm hover:bg-white/5"><ExternalLink className="h-3.5 w-3.5" /> Open live screen</a>
            <a href={`/register/${t.registrationToken}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-ink-850 px-3 text-xs font-semibold shadow-sm hover:bg-white/5"><ExternalLink className="h-3.5 w-3.5" /> Open registration</a>
          </div>
        </div>
      </div>

      {/* Save bar: always in reach while there are changes */}
      <AnimatePresence>
        {dirty && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed inset-x-0 bottom-4 z-30 px-4">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-800/95 p-3 pl-5 shadow-2xl backdrop-blur">
              <span className="flex items-center gap-2 text-sm">
                <Palette className="h-4 w-4 text-lime-glow" />
                {needsUnlock ? <>Unsaved look · saving needs the <b>₹{price}</b> theme add-on</> : 'You have unsaved theme changes'}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setTheme(saved)}>Discard</Button>
                <Button size="sm" onClick={save} loading={saving} disabled={uploading} variant={needsUnlock ? 'gold' : 'primary'}>
                  {needsUnlock ? <><Lock className="h-4 w-4" /> Unlock &amp; save · ₹{price}</> : <><Save className="h-4 w-4" /> Save theme</>}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Section({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-lime-glow/12 font-display text-sm font-bold text-lime-glow ring-1 ring-lime-glow/25">{n}</span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-ink-400">{hint}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}

// ───────── Mock screens (rendered inside themeStyle, so they use the theme's tokens) ─────────

function LivePreview({ name, currency }: { name: string; currency: string }) {
  const teams = [['RS', '#3B82F6', '₹1.4L'], ['DK', '#F59E0B', '₹1.1L'], ['CT', '#EF4444', '₹96K'], ['HW', '#10B981', '₹1.2L']]
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="truncate font-display font-bold">{name}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-hot/15 px-2 py-0.5 text-[10px] font-bold tracking-widest text-rose-hot"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-hot" /> LIVE</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {teams.map(([s, c, v], i) => (
          <div key={s} className={cn('rounded-lg border bg-white/[0.03] px-2 py-1.5', i === 0 ? 'border-lime-glow' : 'border-white/10')}>
            <p className="flex items-center gap-1 text-[10px] font-bold"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{s}</p>
            <p className="font-mono text-[11px] font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-850/70 p-4">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-700 font-display text-xl font-black">RS</div>
        <div>
          <span className="rounded-full border border-lime-glow/40 bg-lime-glow/10 px-2 py-0.5 text-[10px] font-bold uppercase text-lime-glow">All-rounder</span>
          <p className="mt-1 font-display text-2xl font-extrabold">Rohan Shah</p>
          <p className="text-[11px] text-ink-400">Base price {money(10000, currency)}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-ink-950/60 p-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-ink-400">Current bid</p>
        <p className="font-display text-4xl font-black">{money(45000, currency)}</p>
        <span className="mt-2 inline-flex rounded-xl bg-lime-glow/15 px-3 py-1 text-sm font-bold text-lime-glow">Royal Strikers</span>
      </div>
    </div>
  )
}

function RegisterPreview({ name }: { name: string }) {
  return (
    <div className="mx-auto max-w-xs space-y-3 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-700 font-display text-lg font-black">{name.slice(0, 2).toUpperCase()}</div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-lime-glow">Player registration</p>
      <p className="font-display text-2xl font-extrabold">{name}</p>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-ink-850/70 p-4 text-left">
        {['Full name', 'Mobile', 'Playing role'].map((l) => (
          <div key={l}>
            <p className="mb-1 text-[11px] text-ink-300">{l}</p>
            <div className="h-8 rounded-lg border border-white/10 bg-ink-950/60" />
          </div>
        ))}
        <button className="mt-2 h-10 w-full rounded-xl bg-lime-bright text-sm font-semibold text-on-accent">Register</button>
      </div>
    </div>
  )
}

function PaddlePreview({ currency }: { currency: string }) {
  return (
    <div className="mx-auto max-w-[240px] space-y-3">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl text-xs font-black text-white" style={{ background: '#3B82F6' }}>RS</span>
        <div>
          <p className="text-sm font-bold">Royal Strikers</p>
          <p className="text-[11px] text-ink-400">Purse {money(140000, currency)}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-ink-950/60 p-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-ink-400">Rohan Shah · current</p>
        <p className="font-display text-3xl font-black">{money(45000, currency)}</p>
      </div>
      <button className="flex h-24 w-full flex-col items-center justify-center rounded-3xl bg-lime-bright font-display text-on-accent shadow-2xl">
        <span className="text-xs font-semibold uppercase tracking-widest opacity-70">Tap to bid</span>
        <span className="text-2xl font-black">{money(47500, currency)}</span>
      </button>
      <p className="text-center text-[11px] text-gold">You’re not leading</p>
    </div>
  )
}
