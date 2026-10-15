/** Comma-separated ADMIN_EMAILS env var: bootstrap admins who can then promote others from the panel. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminUser(u: { isAdmin: boolean; email: string }) {
  return u.isAdmin || adminEmails().includes(u.email.toLowerCase())
}
