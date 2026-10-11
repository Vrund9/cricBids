import Link from 'next/link'
import { Logo } from './brand'

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 text-sm text-ink-400 sm:flex-row sm:items-center sm:px-6">
        <div className="space-y-2">
          <Logo />
          <p>Live player auctions for cricket tournaments.</p>
        </div>
        <nav className="flex flex-wrap gap-6" aria-label="Footer">
          <a href="/#how" className="hover:text-white">How it works</a>
          <a href="/#features" className="hover:text-white">Features</a>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <a href="/#faq" className="hover:text-white">FAQ</a>
          <Link href="/login" className="hover:text-white">Log in</Link>
          <Link href="/signup" className="hover:text-white">Sign up</Link>
        </nav>
        <p>© {new Date().getFullYear()} CricBid</p>
      </div>
    </footer>
  )
}
