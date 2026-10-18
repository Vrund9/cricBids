import { HttpException, HttpStatus } from '@nestjs/common'

const MAX_FAILS = 5
const WINDOW_MS = 15 * 60 * 1000

/**
 * Per-account brute-force protection on top of the per-IP rate limit: after 5 wrong passwords
 * in 15 minutes, that email is locked for the rest of the window, whichever IP the attempts come from.
 * In memory, so it resets on restart and is per API instance — enough for a single-server deploy.
 */
class LoginGuard {
  private fails = new Map<string, { count: number; first: number }>()

  private key(email: string) {
    return email.trim().toLowerCase()
  }

  check(email: string) {
    const f = this.fails.get(this.key(email))
    if (!f) return
    if (Date.now() - f.first > WINDOW_MS) {
      this.fails.delete(this.key(email))
      return
    }
    if (f.count >= MAX_FAILS) {
      const mins = Math.ceil((f.first + WINDOW_MS - Date.now()) / 60000)
      throw new HttpException(`Too many wrong passwords. Try again in ${mins} minute${mins === 1 ? '' : 's'} or reset your password.`, HttpStatus.TOO_MANY_REQUESTS)
    }
  }

  fail(email: string) {
    const k = this.key(email)
    const f = this.fails.get(k)
    if (!f || Date.now() - f.first > WINDOW_MS) this.fails.set(k, { count: 1, first: Date.now() })
    else f.count++
    // Keep the map from growing without bound under a credential-stuffing run.
    if (this.fails.size > 10_000) this.fails.delete(this.fails.keys().next().value!)
  }

  reset(email: string) {
    this.fails.delete(this.key(email))
  }
}

export const loginGuard = new LoginGuard()
