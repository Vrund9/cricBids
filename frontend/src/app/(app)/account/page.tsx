'use client'

import { useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, Button, Card, Field, Input } from '@/components/ui'
import { api, uploadImage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { User } from '@/lib/types'

function Account() {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [saving, setSaving] = useState(false)
  const [changing, setChanging] = useState(false)
  const [uploading, setUploading] = useState(false)
  if (!user) return null
  const hasPassword = user.hasPassword !== false

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      setUser(await api<User>('/auth/me', { method: 'PATCH', body: { name, avatarUrl: avatarUrl || undefined } }))
      toast.success('Profile saved')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChanging(true)
    try {
      await api('/auth/change-password', { body: hasPassword ? pw : { newPassword: pw.newPassword } })
      setPw({ currentPassword: '', newPassword: '' })
      if (!hasPassword) setUser({ ...user, hasPassword: true })
      toast.success(hasPassword ? 'Password changed' : 'Password set — you can now also log in with email')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setChanging(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Account</h1>
      <Card className="p-6">
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl} name={name || user.name} size={64} color="#34405a" />
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/5">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {uploading ? 'Uploading…' : 'Change photo'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                setUploading(true)
                try {
                  // Saved straight away — no need to press "Save profile".
                  const url = await uploadImage(f)
                  setAvatarUrl(url)
                  setUser(await api<User>('/auth/me', { method: 'PATCH', body: { avatarUrl: url } }))
                  toast.success('Photo updated')
                } catch (err) {
                  toast.error((err as Error).message)
                } finally {
                  setUploading(false)
                }
              }} />
            </label>
          </div>
          <Field label="Name"><Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><Input value={user.email} disabled /></Field>
          <Button type="submit" loading={saving}>Save profile</Button>
        </form>
      </Card>
      <Card className="p-6">
        <h2 className="font-semibold">{hasPassword ? 'Change password' : 'Set a password'}</h2>
        {!hasPassword && <p className="mt-1 text-sm text-ink-300">You sign in with Google. Add a password to also log in with your email.</p>}
        <form onSubmit={changePassword} className="mt-4 space-y-4">
          {hasPassword && <Field label="Current password"><Input type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>}
          <Field label="New password" hint="At least 8 characters"><Input type="password" autoComplete="new-password" required minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
          <Button type="submit" variant="secondary" loading={changing}>{hasPassword ? 'Update password' : 'Set password'}</Button>
        </form>
      </Card>
    </main>
  )
}

export default function Page() {
  return <Account />
}
