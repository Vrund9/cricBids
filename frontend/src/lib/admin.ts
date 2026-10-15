'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

export interface Paged<T> {
  total: number
  page: number
  pageSize: number
  rows: T[]
}

export interface AdminUserRow {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  createdAt: string
  lastLoginAt: string | null
  suspendedAt: string | null
  isAdmin: boolean
  google: boolean
  hasPassword: boolean
  seasonPassUntil: string | null
  seasonPassActive: boolean
  proTournaments: number
  paid: boolean
  tournaments: number
  payments: number
}

export interface AdminPayment {
  id: string
  kind: 'TOURNAMENT_PRO' | 'SEASON_PASS'
  amount: number
  currency: string
  source: 'DEMO' | 'ADMIN' | 'GATEWAY'
  note: string | null
  createdAt: string
  user: { id: string; name: string; email: string }
  tournament: { id: string; name: string } | null
}

export interface AuditEntry {
  id: string
  actorEmail: string
  action: string
  targetType: string | null
  targetId: string | null
  details: Record<string, unknown> | null
  createdAt: string
}

export interface AdminUserDetail extends AdminUserRow {
  tournamentsList: { id: string; name: string; status: string; plan: 'FREE' | 'PRO'; createdAt: string; liveToken: string; _count: { teams: number; players: number } }[]
  paymentsList: AdminPayment[]
  activity: AuditEntry[]
}

export interface AdminTournamentRow {
  id: string
  name: string
  status: string
  plan: 'FREE' | 'PRO'
  planActivatedAt: string | null
  createdAt: string
  updatedAt: string
  liveToken: string
  venue: string | null
  auctionDate: string | null
  owner: { id: string; name: string; email: string; seasonPassUntil: string | null }
  _count: { teams: number; players: number; bids: number }
}

export interface LiveTournament {
  id: string
  name: string
  status: string
  plan: 'FREE' | 'PRO'
  liveToken: string
  updatedAt: string
  owner: { id: string; name: string; email: string }
  _count: { teams: number; players: number; bids: number }
  state: { startedAt: string | null } | null
}

export interface AdminOverview {
  users: { total: number; new7d: number; new30d: number; suspended: number; google: number; admins: number }
  paid: { users: number; seasonPasses: number; proTournaments: number }
  revenue: { total: number; last30d: number; payments30d: number }
  tournaments: { total: number; new30d: number; byStatus: Record<string, number> }
  players: number
  bids: number
  charts: { signups: { date: string; count: number }[]; tournaments: { date: string; count: number }[] }
  recentUsers: { id: string; name: string; email: string; avatarUrl: string | null; createdAt: string; google: boolean }[]
  recentPayments: AdminPayment[]
  live: LiveTournament[]
  billingMode: 'demo' | 'disabled'
}

export interface PlatformSettings {
  signupsEnabled: boolean
  announcement: { text: string; tone: 'info' | 'success' | 'warning' } | null
  billingMode: 'auto' | 'demo' | 'disabled'
  freeMaxTeams: number
  freeMaxPlayers: number
  proMaxTeams: number
  proMaxPlayers: number
}

/** Fetch an admin endpoint; re-runs when `path` changes. `reload()` refetches in place. */
export function useAdmin<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!path) return
    let alive = true
    api<T>(path)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError((e as Error).message))
    return () => {
      alive = false
    }
  }, [path, tick])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, reload, setData }
}

export const PAYMENT_KIND_LABEL: Record<AdminPayment['kind'], string> = { TOURNAMENT_PRO: 'Tournament Pro', SEASON_PASS: 'Season Pass' }
export const PAYMENT_SOURCE_META: Record<AdminPayment['source'], { label: string; color: string }> = {
  DEMO: { label: 'Demo', color: '#8a94ad' },
  ADMIN: { label: 'Admin grant', color: '#a78bfa' },
  GATEWAY: { label: 'Paid', color: '#c8ff2e' },
}

const ACTION_LABEL: Record<string, string> = {
  'user.suspend': 'Suspended user',
  'user.unsuspend': 'Reactivated user',
  'user.promote': 'Made admin',
  'user.demote': 'Removed admin',
  'user.update': 'Edited user',
  'user.delete': 'Deleted user',
  'user.season_pass.grant': 'Granted Season Pass',
  'user.season_pass.revoke': 'Revoked Season Pass',
  'tournament.upgrade': 'Upgraded tournament to Pro',
  'tournament.downgrade': 'Moved tournament to Free',
  'settings.update': 'Changed settings',
}
export const actionLabel = (a: string) => ACTION_LABEL[a] ?? a
