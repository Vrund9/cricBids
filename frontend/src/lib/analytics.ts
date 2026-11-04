import { track as vercelTrack } from '@vercel/analytics'

/** Google Analytics 4 measurement ID (G-XXXXXXX). Analytics is Vercel-only when it isn't set. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || ''

/**
 * Share links carry secrets in the path (a team's private bidding paddle, the live screen, the
 * registration form) and reset links carry one in the query. Analytics only ever sees the redacted
 * form, e.g. `/bid/[token]`.
 */
const TOKEN_PATH = /^\/(bid|live|register)\/[^/?#]+/

export function redactUrl(url: string) {
  try {
    const u = new URL(url, 'http://x')
    const path = u.pathname.replace(TOKEN_PATH, '/$1/[token]')
    const isAbsolute = /^https?:\/\//.test(url)
    return (isAbsolute ? u.origin : '') + path
  } catch {
    return url.split(/[?#]/)[0].replace(TOKEN_PATH, '/$1/[token]')
  }
}

export const isTokenPath = (path: string) => TOKEN_PATH.test(path)

type EventName = 'sign_up' | 'login' | 'tournament_created' | 'auction_started' | 'auction_finished' | 'player_registered'
type Props = Record<string, string | number | boolean | null>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** Key product events, sent to Vercel Analytics and (when configured) Google Analytics. Never throws. */
export function track(event: EventName, props?: Props) {
  try {
    vercelTrack(event, props)
  } catch {}
  try {
    window.gtag?.('event', event, props ?? {})
  } catch {}
}
