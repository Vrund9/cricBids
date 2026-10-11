/** Web origins allowed to call the API and open sockets. */
export function allowedOrigins(): string[] {
  return (process.env.WEB_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
}
