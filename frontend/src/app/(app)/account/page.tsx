'use client'

import { useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, Button, Card, Field, Input, Switch } from '@/components/ui'
import { api, uploadImage } from '@/lib/api'
import { useImageCrop } from '@/components/image-crop'
import { useAuth } from '@/lib/auth'
import type { User } from '@/lib/types'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const crop = useImageCrop()
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

  const setPosterPrices = async (posterPrices: boolean) => {
    setUser({ ...user, posterPrices })
    try {
      setUser(await api<User>('/auth/me', { method: 'PATCH', body: { posterPrices } }))
    } catch (err) {
      setUser({ ...user, posterPrices: !posterPrices })
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-6">
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
                const file = await crop(f, { title: 'Adjust your photo', shape: 'circle' })
                if (!file) return
                setUploading(true)
                try {
                  // Saved straight away — no need to press "Save profile".
                  const url = await uploadImage(file)
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
        <p className="font-semibold">Share images</p>
        <p className="mb-4 text-sm text-ink-400">The top buys and squad pictures on each tournament’s Results tab.</p>
        <Switch
          checked={user.posterPrices !== false}
          onChange={setPosterPrices}
          label="Show prices"
          description="Each player’s sold price under their photo, and the total spent."
        />
      </Card>
    </div>
  )
}
