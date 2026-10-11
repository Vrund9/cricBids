'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Tournament } from '@/lib/types'

interface Ctx {
  t: Tournament
  reload: () => Promise<void>
  update: (patch: Partial<Tournament> & Record<string, unknown>) => Promise<Tournament>
}

const TournamentContext = createContext<Ctx | null>(null)

export function TournamentProvider({ id, children, fallback, onError }: { id: string; children: React.ReactNode; fallback: React.ReactNode; onError: (e: Error) => React.ReactNode }) {
  const [t, setT] = useState<Tournament | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    try {
      setT(await api<Tournament>(`/tournaments/${id}`))
    } catch (e) {
      setError(e as Error)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  const update = useCallback(
    async (patch: Record<string, unknown>) => {
      await api(`/tournaments/${id}`, { method: 'PATCH', body: patch })
      const fresh = await api<Tournament>(`/tournaments/${id}`)
      setT(fresh)
      return fresh
    },
    [id],
  )

  if (error) return <>{onError(error)}</>
  if (!t) return <>{fallback}</>
  return <TournamentContext.Provider value={{ t, reload, update }}>{children}</TournamentContext.Provider>
}

export function useTournament() {
  const ctx = useContext(TournamentContext)
  if (!ctx) throw new Error('useTournament must be used inside TournamentProvider')
  return ctx
}
