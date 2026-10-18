'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Card, Field, Input } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export default function PasswordPage() {
  const { user, setUser } = useAuth()
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [changing, setChanging] = useState(false)
  if (!user) return null
  const hasPassword = user.hasPassword !== false

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
    <Card className="p-6">
      <h2 className="font-semibold">{hasPassword ? 'Change password' : 'Set a password'}</h2>
      {!hasPassword && <p className="mt-1 text-sm text-ink-300">You sign in with Google. Add a password to also log in with your email.</p>}
      <form onSubmit={changePassword} className="mt-4 space-y-4">
        {hasPassword && <Field label="Current password"><Input type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>}
        <Field label="New password" hint="At least 8 characters"><Input type="password" autoComplete="new-password" required minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
        <Button type="submit" loading={changing}>{hasPassword ? 'Update password' : 'Set password'}</Button>
      </form>
    </Card>
  )
}
