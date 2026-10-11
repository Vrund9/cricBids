import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-8xl font-black text-white/10">404</p>
      <h1 className="font-display text-3xl font-bold">Stumped! This page doesn’t exist.</h1>
      <p className="text-ink-300">The link may be mistyped, or the organiser may have reset it.</p>
      <Link href="/" className="mt-2 rounded-xl bg-lime-glow px-5 py-2.5 font-semibold text-ink-950">Back to home</Link>
    </main>
  )
}
