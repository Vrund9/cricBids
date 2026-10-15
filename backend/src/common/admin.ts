/**
 * Comma-separated ADMIN_EMAILS env var — the only way to get admin access.
 * Admins can't be added from the app, so access is controlled entirely on the server.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminUser(u: { email: string }) {
  return adminEmails().includes(u.email.toLowerCase())
}
