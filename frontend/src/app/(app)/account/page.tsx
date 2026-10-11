'use client'

import { useState } from 'react'
import { ImagePlus } from 'lucide-react'
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
  if (!user) return null

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
      await api('/auth/change-password', { body: pw })
      setPw({ currentPassword: '', newPassword: '' })
      toast.success('Password changed')
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
              <ImagePlus className="h-4 w-4" /> Photo
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                try {
                  setAvatarUrl(await uploadImage(f))
                } catch (err) {
                  toast.error((err as Error).message)
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
        <h2 className="mb-4 font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <Field label="Current password"><Input type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
          <Field label="New password" hint="At least 8 characters"><Input type="password" autoComplete="new-password" required minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
          <Button type="submit" variant="secondary" loading={changing}>Update password</Button>
        </form>
      </Card>
    </main>
  )
}

export default function Page() {
  return <Account />
}
