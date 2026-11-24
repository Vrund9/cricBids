'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Camera, CheckCircle2, Lock, Search } from 'lucide-react'
import { toast } from 'sonner'
import { LogoMark } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, Button, Input } from '@/components/ui'
import { uploadImage } from '@/lib/api'
import { useImageCrop } from '@/components/image-crop'
import { cn } from '@/lib/cn'
import { themeStyle } from '@/lib/themes'
import type { PhotoConfig, PhotoPlayer } from './page'

export function PhotoUploader({ token, config }: { token: string; config: PhotoConfig }) {
  const [players, setPlayers] = useState(config.players)
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const crop = useImageCrop()
  const [savedId, setSavedId] = useState<string | null>(null)
  const t = config.tournament
  const selected = players.find((p) => p.id === selectedId) ?? null

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return players
    return players.filter((p) => p.name.toLowerCase().includes(term) || String(p.serial) === term.replace(/^#/, ''))
  }, [players, q])

  const choose = (p: PhotoPlayer | null) => {
    setSelectedId(p?.id ?? null)
    setSavedId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const upload = async (picked: File) => {
    if (!selected) return
    const file = await crop(picked, { title: 'Adjust your photo' })
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file, `/public/photos/${token}/${selected.id}`)
      setPlayers((ps) => ps.map((p) => (p.id === selected.id ? { ...p, photoUrl: url } : p)))
      setSavedId(selected.id)
      toast.success('Photo saved')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="screen-adaptive relative min-h-dvh px-4 py-10" style={themeStyle(config.theme)}>
      <ThemeToggle className="absolute right-4 top-4" />
      {(config.theme?.background ?? 'glow') === 'glow' && <div className="grid-bg pointer-events-none absolute inset-0 -z-10" />}
      <div className="mx-auto max-w-xl">
        <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          {t.logoUrl ? <Avatar src={t.logoUrl} name={t.name} size={84} rounded="xl" className="mx-auto rounded-3xl" /> : <LogoMark className="mx-auto h-14 w-14" />}
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-lime-glow">Player photo</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">{t.name}</h1>
          {config.open && <p className="mx-auto mt-3 max-w-md text-sm text-ink-300">{selected ? 'Now upload a clear face photo.' : 'First pick your name from the list, then upload your photo.'}</p>}
        </motion.header>

        <AnimatePresence mode="wait">
          {!config.open ? (
            <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card mt-10 p-8 text-center">
              <Lock className="mx-auto h-10 w-10 text-ink-400" />
              <h2 className="mt-4 font-display text-2xl font-bold">Photo uploads are closed</h2>
              <p className="mt-2 text-sm text-ink-300">This auction is over. Contact the organiser if your photo still needs changing.</p>
            </motion.div>
          ) : selected ? (
            <motion.div key={`player-${selected.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card mt-10 p-6 text-center sm:p-8">
              <button onClick={() => choose(null)} className="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-white">
                <ArrowLeft className="h-4 w-4" /> Not you? Pick another name
              </button>
              <div className="mt-6">
                <Avatar src={selected.photoUrl} name={selected.name} size={160} rounded="xl" className="mx-auto rounded-3xl" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold">{selected.name}</h2>
              <p className="text-sm text-ink-400">Player #{selected.serial}</p>

              {savedId === selected.id ? (
                <div className="mt-6">
                  <p className="inline-flex items-center gap-2 font-semibold text-lime-glow"><CheckCircle2 className="h-5 w-5" /> Photo saved</p>
                  <p className="mt-1 text-sm text-ink-300">It will show on the big screen when you’re up.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <PhotoPicker label="Change photo" uploading={uploading} onFile={upload} variant="secondary" />
                    <Button variant="ghost" onClick={() => choose(null)}>Upload for another player</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  <PhotoPicker label="Upload photo" uploading={uploading} onFile={upload} />
                  <p className="mt-3 text-xs text-ink-400">A clear photo of your face works best. JPG, PNG or WebP.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card mt-10 overflow-hidden">
              <div className="border-b border-white/5 p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <Input placeholder="Search your name or player number" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search players" />
                </div>
              </div>
              <ul className="divide-y divide-white/5">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => choose(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]">
                      <Avatar src={p.photoUrl} name={p.name} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="text-xs text-ink-400">#{p.serial}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-lime-glow">Select</span>
                    </button>
                  </li>
                ))}
              </ul>
              {filtered.length === 0 && (
                <p className="p-8 text-center text-sm text-ink-400">
                  {players.length === 0 ? 'No players have been added yet.' : 'No player matches that. Check the spelling, or ask the organiser to add you.'}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {!config.theme?.hideBranding && <p className="mt-8 text-center text-xs text-ink-500">Powered by <Link href="/" className="font-semibold text-ink-300 hover:text-lime-glow">BidWicket</Link></p>}
      </div>
    </main>
  )
}

function PhotoPicker({ label, uploading, onFile, variant = 'primary' }: { label: string; uploading: boolean; onFile: (f: File) => void; variant?: 'primary' | 'secondary' }) {
  return (
    <label
      className={cn(
        'inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 font-semibold transition',
        variant === 'primary' ? 'bg-lime-bright text-on-accent hover:bg-lime-hover' : 'border border-white/10 bg-white/[0.07] hover:bg-white/[0.12]',
        uploading && 'pointer-events-none opacity-60',
      )}
    >
      <Camera className="h-5 w-5" /> {uploading ? 'Uploading…' : label}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Clear the picker so choosing the same file again (after an error) still triggers an upload.
          e.target.value = ''
          if (file) onFile(file)
        }}
      />
    </label>
  )
}
