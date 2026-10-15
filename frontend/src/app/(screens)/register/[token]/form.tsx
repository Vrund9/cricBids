'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, Camera, CheckCircle2, Lock, MapPin, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { LogoMark } from '@/components/brand'
import { Avatar, Button, Field, Input, Select, Textarea } from '@/components/ui'
import { api, uploadImage } from '@/lib/api'
import type { RegField } from '@/lib/types'
import type { FormConfig } from './page'
import { cn } from '@/lib/cn'
import { themeStyle } from '@/lib/themes'
import { LocalDate } from '@/components/local-date'

const DATE_OPTS: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

export function RegistrationForm({ token, config }: { token: string; config: FormConfig }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ serial: number; name: string; approved: boolean } | null>(null)
  const t = config.tournament

  const set = (k: string, v: string) => {
    setValues((x) => ({ ...x, [k]: v }))
    setErrors((e) => ({ ...e, [k]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    for (const f of config.fields) {
      const v = (values[f.key] ?? '').trim()
      if (f.required && !v) e[f.key] = `${f.label} is required`
      else if (v && f.type === 'tel' && v.replace(/\D/g, '').length < 7) e[f.key] = 'Enter a valid mobile number'
      else if (v && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) e[f.key] = 'Enter a valid email'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the highlighted fields')
      return
    }
    setSubmitting(true)
    try {
      setDone(await api(`/public/register/${token}`, { body: values, auth: false }))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const share = async () => {
    const url = window.location.href
    const text = `🏏 Register for ${t.name} player auction:`
    if (navigator.share) {
      try {
        await navigator.share({ title: t.name, text, url })
        return
      } catch {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener')
  }

  return (
    <main className="relative min-h-dvh px-4 py-10" style={themeStyle(config.theme)}>
      <div className="grid-bg pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto max-w-xl">
        <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          {t.logoUrl ? <Avatar src={t.logoUrl} name={t.name} size={84} rounded="xl" className="mx-auto rounded-3xl" /> : <LogoMark className="mx-auto h-14 w-14" />}
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-lime-glow">Player registration</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold">{t.name}</h1>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-ink-300">
            {t.venue && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {t.venue}</span>}
            {t.auctionDate && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Auction <LocalDate value={t.auctionDate} options={DATE_OPTS} /></span>}
          </div>
          {t.description && <p className="mx-auto mt-4 max-w-md whitespace-pre-line text-sm text-ink-300">{t.description}</p>}
        </motion.header>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card mt-10 p-8 text-center">
              <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
                <CheckCircle2 className="mx-auto h-16 w-16 text-lime-glow" />
              </motion.div>
              <h2 className="mt-4 font-display text-3xl font-bold">You’re in, {done.name.split(' ')[0]}!</h2>
              <p className="mt-2 text-ink-300">Your player number is</p>
              <p className="font-display text-7xl font-black text-lime-glow">#{done.serial}</p>
              <p className="mt-4 text-sm text-ink-300">
                {done.approved ? 'You’ll go under the hammer on auction day. Good luck!' : 'The organiser will review your entry before the auction.'}
              </p>
              <Button className="mt-6" variant="secondary" onClick={share}><Share2 className="h-4 w-4" /> Share with teammates</Button>
            </motion.div>
          ) : !config.open ? (
            <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card mt-10 p-8 text-center">
              <Lock className="mx-auto h-10 w-10 text-ink-400" />
              <h2 className="mt-4 font-display text-2xl font-bold">Registrations are closed</h2>
              <p className="mt-2 text-sm text-ink-300">Contact the organiser if you still want to take part.</p>
            </motion.div>
          ) : (
            <motion.form key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onSubmit={submit} className="card mt-10 space-y-5 p-6 sm:p-8" noValidate>
              {config.fields.map((f) => (
                <FieldInput key={f.key} field={f} value={values[f.key] ?? ''} error={errors[f.key]} onChange={(v) => set(f.key, v)} token={token} uploading={uploading} setUploading={setUploading} />
              ))}
              <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={uploading}>Register</Button>
              <p className="text-center text-xs text-ink-400">Your mobile number and email are only visible to the organiser — never on the auction screen.</p>
            </motion.form>
          )}
        </AnimatePresence>
        {!config.theme?.hideBranding && <p className="mt-8 text-center text-xs text-ink-500">Powered by <Link href="/" className="font-semibold text-ink-300 hover:text-lime-glow">BidWicket</Link></p>}
      </div>
    </main>
  )
}

function FieldInput({ field: f, value, error, onChange, token, uploading, setUploading }: { field: RegField; value: string; error?: string; onChange: (v: string) => void; token: string; uploading: boolean; setUploading: (v: boolean) => void }) {
  const id = `f-${f.key}`
  const label = (
    <>
      {f.label} {f.required && <span className="text-rose-hot">*</span>}
    </>
  )
  if (f.type === 'photo') {
    return (
      <Field label={label} error={error}>
        <label className={cn('flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed p-4 transition hover:bg-white/[0.02]', error ? 'border-rose-hot/50' : 'border-white/15')}>
          {value ? <Avatar src={value} name="You" size={72} rounded="xl" /> : <span className="grid h-[72px] w-[72px] place-items-center rounded-xl bg-white/5"><Camera className="h-7 w-7 text-ink-300" /></span>}
          <span className="text-sm">
            <span className="block font-semibold">{uploading ? 'Uploading…' : value ? 'Change photo' : 'Add a clear face photo'}</span>
            <span className="text-xs text-ink-400">Shown on the big screen when you’re up</span>
          </span>
          <input
            id={id}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setUploading(true)
              try {
                onChange(await uploadImage(file, `/public/register/${token}/photo`))
              } catch (err) {
                toast.error((err as Error).message)
              } finally {
                setUploading(false)
              }
            }}
          />
        </label>
      </Field>
    )
  }
  if (f.type === 'select') {
    return (
      <Field label={label} error={error} htmlFor={id}>
        {f.key === 'role' ? (
          <div className="grid grid-cols-2 gap-2">
            {f.options?.map((o) => (
              <button type="button" key={o} onClick={() => onChange(o)} className={cn('rounded-xl border px-3 py-3 text-sm font-semibold transition', value === o ? 'border-lime-glow bg-lime-glow/10 text-lime-glow' : 'border-white/10 hover:border-white/25')}>
                {o}
              </button>
            ))}
          </div>
        ) : (
          <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(error && 'border-rose-hot/50')}>
            <option value="">Choose…</option>
            {f.options?.map((o) => <option key={o}>{o}</option>)}
          </Select>
        )}
      </Field>
    )
  }
  if (f.type === 'textarea') {
    return (
      <Field label={label} error={error} htmlFor={id}>
        <Textarea id={id} value={value} maxLength={1000} onChange={(e) => onChange(e.target.value)} />
      </Field>
    )
  }
  return (
    <Field label={label} error={error} htmlFor={id}>
      <Input
        id={id}
        type={f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : 'text'}
        inputMode={f.type === 'tel' ? 'tel' : f.type === 'number' ? 'numeric' : undefined}
        autoComplete={f.key === 'name' ? 'name' : f.key === 'phone' ? 'tel' : f.key === 'email' ? 'email' : f.key === 'city' ? 'address-level2' : 'off'}
        value={value}
        maxLength={200}
        onChange={(e) => onChange(e.target.value)}
        className={cn(error && 'border-rose-hot/50')}
      />
    </Field>
  )
}
