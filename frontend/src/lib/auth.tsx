'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, getToken, setToken } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (token: string, user: User) => void
  signOut: () => void
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
    const onLogout = () => setUser(null)
    window.addEventListener('cricbid:logout', onLogout)
    return () => window.removeEventListener('cricbid:logout', onLogout)
  }, [])

  const signIn = useCallback((token: string, u: User) => {
    setToken(token)
    setUser(u)
  }, [])

  const signOut = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, signIn, signOut, setUser }), [user, loading, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** Redirect to /login when signed out. Returns the user once known. */
export function useRequireAuth() {
  const auth = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (!auth.loading && !auth.user) {
      const next = typeof window !== 'undefined' ? window.location.pathname : '/dashboard'
      router.replace(`/login?next=${encodeURIComponent(next)}`)
    }
  }, [auth.loading, auth.user, router])
  return auth
}
