'use client'

import Link from 'next/link'
import Script from 'next/script'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Logo } from './brand'
import { ThemeToggle } from './theme-toggle'
import { Button, Field, Input } from './ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { User } from '@/lib/types'

function Shell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="grid-bg absolute inset-0 -z-10" />
      <ThemeToggle className="absolute right-4 top-4" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 20 }} className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-7 sm:p-8">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-300">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
        {footer && <p className="mt-6 text-center text-sm text-ink-300">{footer}</p>}
      </motion.div>
    </main>
  )
}

function useAuthSuccess() {
  const { signIn } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  return (res: { token: string; user: User }) => {
    signIn(res.token, res.user)
    const next = params.get('next')
    router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard')
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

interface GoogleTokenClient { requestAccessToken: () => void }
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (opts: {
            client_id: string
            scope: string
            callback: (res: { access_token?: string; error?: string }) => void
            error_callback?: (err: { type: string }) => void
          }) => GoogleTokenClient
        }
      }
    }
  }
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/** Branded "Continue with Google" button (GIS token client popup). Renders nothing unless NEXT_PUBLIC_GOOGLE_CLIENT_ID is set. */
function GoogleButton() {
  const onSuccess = useAuthSuccess()
  const client = useRef<GoogleTokenClient | null>(null)
  // The token client keeps the callback from init, so route it through a ref to always hit the latest handler.
  const handler = useRef<(accessToken: string) => void>(() => {})
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    handler.current = async (accessToken: string) => {
      setLoading(true)
      setError(null)
      try {
        onSuccess(await api('/auth/google', { body: { accessToken }, auth: false }))
      } catch (err) {
        setError((err as Error).message)
        setLoading(false)
      }
    }
  })

  if (!GOOGLE_CLIENT_ID) return null

  const init = () => {
    const oauth2 = window.google?.accounts.oauth2
    if (!oauth2) return
    client.current = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (res) => {
        if (res.access_token) handler.current(res.access_token)
        else setLoading(false)
      },
      // Popup closed or blocked: just reset the button.
      error_callback: () => setLoading(false),
    })
    setReady(true)
  }

  return (
    <div className="mt-6">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={init} />
      <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-widest text-ink-400">
        <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
      </div>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full gap-3"
        disabled={!ready}
        loading={loading}
        onClick={() => {
          setError(null)
          setLoading(true)
          client.current?.requestAccessToken()
        }}
      >
        {!loading && <GoogleLogo className="h-5 w-5" />}
        Continue with Google
      </Button>
      {error && <p className="mt-3 rounded-lg bg-rose-hot/10 px-3 py-2 text-sm text-rose-hot">{error}</p>}
    </div>
  )
}

function RedirectIfSignedIn() {
  const { user } = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])
  return null
}

function LoginInner() {
  const onSuccess = useAuthSuccess()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      onSuccess(await api('/auth/login', { body: { email, password }, auth: false }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Shell title="Welcome back" subtitle="Log in to manage your tournaments." footer={<>New here? <Link href="/signup" className="font-semibold text-lime-glow hover:underline">Create an account</Link></>}>
      <RedirectIfSignedIn />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={<span className="flex justify-between">Password <Link href="/forgot-password" className="text-xs font-normal text-ink-300 hover:text-white">Forgot?</Link></span>} htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p className="rounded-lg bg-rose-hot/10 px-3 py-2 text-sm text-rose-hot">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>Log in</Button>
      </form>
      <GoogleButton />
    </Shell>
  )
}

function SignupInner() {
  const onSuccess = useAuthSuccess()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [closed, setClosed] = useState(false)
  useEffect(() => {
    api<{ signupsEnabled: boolean }>('/config', { auth: false })
      .then((c) => setClosed(!c.signupsEnabled))
      .catch(() => {})
  }, [])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      onSuccess(await api('/auth/signup', { body: form, auth: false }))
      toast.success('Account created — let’s set up your first auction')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Shell title="Create your account" subtitle="Run your first live auction in minutes. Free to start." footer={<>Already have an account? <Link href="/login" className="font-semibold text-lime-glow hover:underline">Log in</Link></>}>
      <RedirectIfSignedIn />
      {closed && <p className="mb-4 rounded-xl bg-gold/10 px-4 py-3 text-sm text-gold">New sign-ups are paused right now. Please check back soon.</p>}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Your name" htmlFor="name">
          <Input id="name" autoComplete="name" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters">
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {error && <p className="rounded-lg bg-rose-hot/10 px-3 py-2 text-sm text-rose-hot">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>Create account</Button>
      </form>
      <GoogleButton />
    </Shell>
  )
}

export function ForgotForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/auth/forgot-password', { body: { email }, auth: false })
      setSent(true)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Shell title="Reset your password" subtitle="We’ll email you a link to choose a new one." footer={<Link href="/login" className="hover:text-white">Back to log in</Link>}>
      {sent ? (
        <p className="rounded-xl bg-lime-glow/10 p-4 text-sm text-lime-glow">If an account exists for {email}, a reset link is on its way. It expires in 1 hour.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset link</Button>
        </form>
      )}
    </Shell>
  )
}

function ResetInner() {
  const params = useSearchParams()
  const onSuccess = useAuthSuccess()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = params.get('token') || ''
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      onSuccess(await api('/auth/reset-password', { body: { token, password }, auth: false }))
      toast.success('Password updated')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Shell title="Choose a new password" subtitle="You’ll be logged in right after." footer={<Link href="/login" className="hover:text-white">Back to log in</Link>}>
      {!token ? (
        <p className="text-sm text-rose-hot">This reset link is missing its token. Request a new one.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password" htmlFor="password" hint="At least 8 characters">
            <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="rounded-lg bg-rose-hot/10 px-3 py-2 text-sm text-rose-hot">{error}</p>}
          <Button type="submit" size="lg" className="w-full" loading={loading}>Update password</Button>
        </form>
      )}
    </Shell>
  )
}

export const LoginForm = () => <Suspense><LoginInner /></Suspense>
export const SignupForm = () => <Suspense><SignupInner /></Suspense>
export const ResetForm = () => <Suspense><ResetInner /></Suspense>
