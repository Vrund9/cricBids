'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ThemeEditor } from '@/components/theme-editor'
import { TournamentProvider } from '@/components/tournament-context'
import { UpgradeProvider } from '@/components/upgrade'
import { Card, EmptyState, Field, PageLoader, Select } from '@/components/ui'
import { api } from '@/lib/api'
import type { TournamentSummary } from '@/lib/types'

export default function ThemeSettingsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ThemeSettings />
    </Suspense>
  )
}

/**
 * Screen themes are per tournament, so Settings → Theme starts with a tournament picker
 * (preselected from ?t=, e.g. when coming from a tournament page). Completed auctions are final.
 */
function ThemeSettings() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [items, setItems] = useState<TournamentSummary[] | null>(null)

  useEffect(() => {
    api<TournamentSummary[]>('/tournaments')
      .then((all) => setItems(all.filter((t) => t.status !== 'COMPLETED')))
      .catch((e) => toast.error(e.message))
  }, [])

  if (!items) return <PageLoader />
  if (!items.length) {
    return (
      <EmptyState title="No upcoming auctions" action={<Link href="/dashboard" className="text-sm font-semibold text-lime-glow">Create an auction</Link>}>
        Screen themes are set per auction. Create one to pick its colours and background.
      </EmptyState>
    )
  }

  const wanted = params.get('t')
  const selected = items.find((t) => t.id === wanted) ?? items[0]

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Field label="Tournament" hint="Each auction has its own look on the big screen, registration form and team paddles.">
          <Select value={selected.id} onChange={(e) => router.replace(`${pathname}?t=${e.target.value}`, { scroll: false })}>
            {items.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
      </Card>
      <TournamentProvider key={selected.id} id={selected.id} fallback={<PageLoader />} onError={(e) => <EmptyState title="Can’t open this tournament">{e.message}</EmptyState>}>
        <UpgradeProvider>
          <ThemeEditor />
        </UpgradeProvider>
      </TournamentProvider>
    </div>
  )
}
