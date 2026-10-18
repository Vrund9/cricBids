'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Save, ShieldCheck, SlidersHorizontal, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin'
import { Button, Card, EmptyState, Field, Input, PageLoader, Select, Switch, Textarea } from '@/components/ui'
import { api } from '@/lib/api'
import { PlatformSettings, useAdmin } from '@/lib/admin'

interface SettingsResponse {
  settings: PlatformSettings
  effectiveBillingMode: 'demo' | 'disabled'
  adminEmails: string[]
}

export default function AdminSettingsPage() {
  const { data, error, setData } = useAdmin<SettingsResponse>('/admin/settings')
  const [form, setForm] = useState<PlatformSettings | null>(null)
  const [announcement, setAnnouncement] = useState({ text: '', tone: 'info' as 'info' | 'success' | 'warning' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!data) return
    setForm(data.settings)
    setAnnouncement(data.settings.announcement ?? { text: '', tone: 'info' })
  }, [data])

  if (error && !data) return <EmptyState title="Couldn’t load settings">{error}</EmptyState>
  if (!data || !form) return <PageLoader />

  const next: PlatformSettings = { ...form, announcement: announcement.text.trim() ? { text: announcement.text.trim(), tone: announcement.tone } : null }
  const dirty = JSON.stringify(next) !== JSON.stringify(data.settings)

  const save = async () => {
    setSaving(true)
    try {
      setData(await api<SettingsResponse>('/admin/settings', { method: 'PATCH', body: { ...next } }))
      toast.success('Settings saved')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const num = (key: 'freeMaxTeams' | 'freeMaxPlayers' | 'proMaxTeams' | 'proMaxPlayers') => ({
    type: 'number' as const,
    value: String(form[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value === '' ? 0 : Number(e.target.value) }),
  })

  return (
    <>
      <AdminHeader
        title="Settings"
        subtitle="Platform-wide switches. Every change is recorded in the activity log."
        action={<Button onClick={save} loading={saving} disabled={!dirty}><Save className="h-4 w-4" /> Save changes</Button>}
      />

      <div className="space-y-4">
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-lime-glow" /> Access</h2>
          <Switch
            checked={form.signupsEnabled}
            onChange={(v) => setForm({ ...form, signupsEnabled: v })}
            label="Allow new sign-ups"
            description="Turn off to stop new accounts (email and Google). Existing users can still log in."
          />
          <div className="mt-5 rounded-xl bg-white/[0.03] p-4 text-xs text-ink-300">
            <p className="font-semibold text-ink-200">Admin access</p>
            <p className="mt-1">Only {data.adminEmails.length ? data.adminEmails.join(', ') : 'no one'} can open this panel. This is set by ADMIN_EMAILS on the server and can’t be changed from the app.</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Megaphone className="h-4 w-4 text-sky-live" /> Announcement banner</h2>
          <p className="mb-4 text-sm text-ink-300">Shown at the top of every organiser’s dashboard. Leave empty to hide it.</p>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <Field label="Message" hint={`${announcement.text.length}/280`}>
              <Textarea rows={2} maxLength={280} value={announcement.text} onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })} placeholder="e.g. Scheduled maintenance on Sunday 2–3 AM IST" />
            </Field>
            <Field label="Style">
              <Select value={announcement.tone} onChange={(e) => setAnnouncement({ ...announcement, tone: e.target.value as typeof announcement.tone })}>
                <option value="info">Info (blue)</option>
                <option value="success">Success (green)</option>
                <option value="warning">Warning (amber)</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4 text-gold" /> Billing</h2>
          <Field
            label="Upgrade mode"
            hint={<>Currently <b className="text-white">{data.effectiveBillingMode}</b>. “Demo” activates Pro and Season Pass instantly with no charge (for trials). “Disabled” asks users to contact support.</>}
          >
            <Select value={form.billingMode} onChange={(e) => setForm({ ...form, billingMode: e.target.value as PlatformSettings['billingMode'] })} className="sm:w-72">
              <option value="auto">Automatic (server default)</option>
              <option value="demo">Demo: free instant upgrades</option>
              <option value="disabled">Disabled: contact support</option>
            </Select>
          </Field>
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4 text-[#a78bfa]" /> Plan limits</h2>
          <p className="mb-4 text-sm text-ink-300">Enforced immediately on every tournament. Remember to update the pricing page copy if you change these.</p>
          {/* Pay-per-use: the free allowance, then hard caps for every auction. Prices are set in backend/src/common/plans.ts. */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Teams included free" hint="Each team above this is a paid add-on"><Input min={2} max={64} {...num('freeMaxTeams')} /></Field>
            <Field label="Max teams per auction" hint="Paid or with a plan code"><Input min={2} max={64} {...num('proMaxTeams')} /></Field>
            <Field label="Max players per auction"><Input min={10} max={5000} {...num('proMaxPlayers')} /></Field>
          </div>
        </Card>
      </div>
    </>
  )
}
