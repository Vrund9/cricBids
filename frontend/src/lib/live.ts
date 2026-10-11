'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { API_URL, getToken } from './api'
import type { Snapshot } from './types'

export type ConnState = 'connecting' | 'live' | 'reconnecting' | 'offline' | 'error'

interface Options {
  liveToken?: string
  /** Organiser mode: authenticate with JWT and also receive private events. */
  ownerTournamentId?: string
  initial?: Snapshot | null
  onRegistration?: (p: { id: string; name: string; role: string }) => void
}

/**
 * Subscribe to an auction's realtime snapshot stream.
 * - Re-joins automatically after reconnect (venue Wi-Fi drops, phone sleeps).
 * - Ignores out-of-order snapshots using the server version.
 * - Reports clock skew so countdowns match the server, not the phone's clock.
 */
export function useLiveAuction({ liveToken, ownerTournamentId, initial = null, onRegistration }: Options) {
  const [state, setState] = useState<Snapshot | null>(initial)
  const [conn, setConn] = useState<ConnState>('connecting')
  const [viewers, setViewers] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [skew, setSkew] = useState(0)
  const versionRef = useRef(initial?.version ?? -1)
  const socketRef = useRef<Socket | null>(null)
  const regRef = useRef(onRegistration)
  regRef.current = onRegistration

  useEffect(() => {
    if (!liveToken && !ownerTournamentId) return
    const socket = io(`${API_URL}/live`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    })
    socketRef.current = socket

    const accept = (snap: Snapshot | null | undefined, force = false) => {
      if (!snap) return
      // Accept equal versions too: a version-neutral change (e.g. team rename) still rebroadcasts.
      if (!force && snap.version < versionRef.current) return
      versionRef.current = snap.version
      setSkew(snap.serverTime - Date.now())
      setState(snap)
    }

    const join = () => {
      const event = ownerTournamentId ? 'join-owner' : 'join'
      const payload = ownerTournamentId ? { tournamentId: ownerTournamentId, token: getToken() } : { liveToken }
      socket.emit(event, payload, (res: { ok: boolean; state?: Snapshot; error?: string }) => {
        if (!res?.ok) {
          setConn('error')
          setError(res?.error || 'Could not join the auction')
          return
        }
        setError(null)
        setConn('live')
        accept(res.state, true)
      })
    }

    socket.on('connect', join)
    socket.on('disconnect', () => setConn(navigator.onLine ? 'reconnecting' : 'offline'))
    socket.io.on('reconnect_attempt', () => setConn('reconnecting'))
    socket.on('connect_error', () => setConn(navigator.onLine ? 'reconnecting' : 'offline'))
    socket.on('state', (snap: Snapshot) => accept(snap))
    socket.on('viewers', (v: { count: number }) => setViewers(v.count))
    socket.on('registration', (p: { id: string; name: string; role: string }) => regRef.current?.(p))

    // Phones throttle background tabs; force a fresh join when the page becomes visible.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && socket.connected) join()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      socket.removeAllListeners()
      socket.io.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [liveToken, ownerTournamentId])

  return { state, conn, viewers, error, skew, setState }
}

/** Seconds remaining on the bid timer, corrected for clock skew. */
export function useCountdown(endsAt: string | null | undefined, skew: number) {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    if (!endsAt) {
      setLeft(null)
      return
    }
    const end = new Date(endsAt).getTime()
    const tick = () => setLeft(Math.max(0, (end - (Date.now() + skew)) / 1000))
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [endsAt, skew])
  return left
}
