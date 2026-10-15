'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Crown, ExternalLink, Lock, Palette, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useTournament } from '@/components/tournament-context'
import { useUpgrade } from '@/components/upgrade'
import { Badge, Button, Card, Switch } from '@/components/ui'
import { palette, THEMES, themeStyle, type ThemeConfig, type ThemePreset } from '@/lib/themes'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'

export default function ThemePage() {
  const { t, update } = useTournament()
  const { openUpgrade } = useUpgrade()
  const [theme, setTheme] = useState<ThemeConfig>({ preset: 'floodlight', ...(t.theme ?? {}) })
  const [saving, setSaving] = useState(false)
  useEffect(() => setTheme({ preset: 'floodlight', ...(t.theme ?? {}) }), [t.theme])
  const pro = t.planInfo.limits.customTheme
  const dirty = JSON.stringify(theme) !== JSON.stringify({ preset: 'floodlight', ...(t.theme ?? {}) })

  const save = async () => {
    setSaving(true)
    try {
      await update({ theme: { preset: theme.preset, accent: theme.accent || undefined, hideBranding: theme.hideBranding || undefined } })
      toast.success('Theme saved — live screens update instantly')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const p = palette(theme)

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Screen theme</h2>
          <p className="text-sm text-ink-400">How the live big screen, registration form and team paddles look. Changes reach every open screen in realtime.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(THEMES) as ThemePreset[]).map((key) => {
            const pal = THEMES[key]
            const active = theme.preset === key
            return (
              <motion.button
                key={key}
                whileHover={{ y: -3 }}
                onClick={() => setTheme((x) => ({ ...x, preset: key }))}
                className={cn('relative overflow-hidden rounded-2xl border p-4 text-left transition', active ? 'border-2' : 'border-white/10 hover:border-white/25')}
                style={{ ...themeStyle({ preset: key }), borderColor: active ? pal.accent : undefined }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-white">{pal.name}</span>
                  {active && <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: pal.accent }}><Check className="h-3 w-3 text-black" /></span>}
                </div>
                <p className="mt-0.5 text-xs text-ink-300">{pal.vibe}</p>
                <div className="mt-4 flex items-end justify-between">
                  <span className="font-display text-2xl font-black" style={{ color: pal.gold }}>₹1.2L</span>
                  <div className="flex gap-1">
                    {[pal.accent, pal.gold, pal.second].map((c) => <span key={c} className="h-4 w-4 rounded-full" style={{ background: c }} />)}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>

        <Card className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-semibold"><Palette className="h-4 w-4 text-lime-glow" /> Your brand colour {!pro && <Badge color="#ffb020"><Crown className="h-3 w-3" /> Pro</Badge>}</p>
              <p className="text-xs text-ink-400">Overrides the theme’s accent — buttons, highlights and the live dot use it.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className={cn('relative h-10 w-10 cursor-pointer overflow-hidden rounded-xl border border-white/15', !pro && 'opacity-50')} style={{ background: p.accent }}>
                <input type="color" disabled={!pro} value={theme.accent || THEMES[theme.preset].accent} onChange={(e) => setTheme((x) => ({ ...x, accent: e.target.value }))} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Brand colour" />
              </label>
              {theme.accent && <Button size="sm" variant="ghost" onClick={() => setTheme((x) => ({ ...x, accent: undefined }))}>Reset</Button>}
              {!pro && <Button size="sm" variant="gold" onClick={() => openUpgrade('Custom brand colours are a Pro feature')}><Lock className="h-3.5 w-3.5" /> Unlock</Button>}
            </div>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex items-start justify-between gap-4">
            <Switch
              checked={!!theme.hideBranding}
              disabled={!pro}
              onChange={(v) => setTheme((x) => ({ ...x, hideBranding: v }))}
              label={<span className="flex items-center gap-2">Remove “Powered by CricBid” {!pro && <Badge color="#ffb020"><Crown className="h-3 w-3" /> Pro</Badge>}</span>}
              description="White-label the live screen and registration form."
            />
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button onClick={save} loading={saving} disabled={!dirty}><Save className="h-4 w-4" /> Save theme</Button>
          <a href={`/live/${t.liveToken}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold hover:bg-white/5"><ExternalLink className="h-4 w-4" /> Open live screen</a>
          <a href={`/register/${t.registrationToken}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold hover:bg-white/5"><ExternalLink className="h-4 w-4" /> Open registration</a>
        </div>
      </div>

      {/* Live preview */}
      <div className="xl:sticky xl:top-24 xl:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Preview</p>
        <motion.div key={`${theme.preset}${theme.accent}`} initial={{ opacity: 0.4, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="overflow-hidden rounded-3xl border border-white/10 p-5" style={themeStyle(theme)}>
          <div className="flex items-center justify-between">
            <span className="truncate font-display font-bold">{t.name}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-hot/15 px-2 py-0.5 text-[10px] font-bold tracking-widest text-rose-hot"><span className="h-1.5 w-1.5 rounded-full bg-rose-hot" /> LIVE</span>
          </div>
          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-850/70 p-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-700 font-display text-xl font-black">RS</div>
            <div>
              <span className="rounded-full border border-lime-glow/40 bg-lime-glow/10 px-2 py-0.5 text-[10px] font-bold uppercase text-lime-glow">All-rounder</span>
              <p className="mt-1 font-display text-2xl font-extrabold">Rohan Shah</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-ink-950/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-ink-400">Current bid</p>
            <p className="font-display text-4xl font-black">{money(45000, t.currency)}</p>
            <span className="mt-2 inline-flex rounded-xl bg-lime-glow/15 px-3 py-1 text-sm font-bold text-lime-glow">Royal Strikers</span>
          </div>
          <button className="mt-4 h-11 w-full rounded-xl bg-lime-bright font-semibold text-on-accent">Register</button>
          {!theme.hideBranding && <p className="mt-3 text-center text-[10px] text-ink-400">Powered by CricBid</p>}
        </motion.div>
      </div>
    </div>
  )
}
