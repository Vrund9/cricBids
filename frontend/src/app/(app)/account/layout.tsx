import type { Metadata } from 'next'
import { AccountNav, SettingsContent } from '@/components/account-nav'

export const metadata: Metadata = { title: 'Settings' }

/** Settings are split into small pages (screen theme, profile, password, feedback, plan) behind one side menu. */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        <AccountNav />
        <SettingsContent>{children}</SettingsContent>
      </div>
    </main>
  )
}
