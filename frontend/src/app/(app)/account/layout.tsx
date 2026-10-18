import type { Metadata } from 'next'
import { AccountNav } from '@/components/account-nav'

export const metadata: Metadata = { title: 'Account' }

/** Account is split into small pages (profile, password, feedback, plan) behind one side menu. */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Account</h1>
      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        <AccountNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  )
}
