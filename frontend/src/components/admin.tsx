'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button, Card, Input, Modal } from './ui'
import { cn } from '@/lib/cn'

export function AdminHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-300">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, hint, icon, accent = '#c8ff2e' }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; accent?: string }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl" style={{ background: accent }} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">{label}</p>
        {icon && <span style={{ color: accent }}>{icon}</span>}
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-300">{hint}</p>}
    </Card>
  )
}

/** Small dependency-free bar chart for daily counts. */
export function BarChart({ data, color = '#c8ff2e', label }: { data: { date: string; count: number }[]; color?: string; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-ink-400">{total} in 30 days</p>
      </div>
      <div className="flex h-36 items-end gap-[3px]">
        {data.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[3px] transition-opacity group-hover:opacity-100"
              style={{ height: `${Math.max(d.count ? 6 : 2, (d.count / max) * 100)}%`, background: d.count ? color : 'rgba(255,255,255,0.06)', opacity: d.count ? 0.85 : 1 }}
            />
            <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-ink-800 px-2 py-1 text-[11px] group-hover:block">
              {new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: <b>{d.count}</b>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-ink-400">
        <span>{new Date(data[0]?.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [text, setText] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => text !== value && onChange(text), 300)
    return () => clearTimeout(t)
  }, [text, value, onChange])
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  )
}

export function FilterTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', value === o.value ? 'bg-lime-glow text-ink-950' : 'text-ink-300 hover:bg-white/5 hover:text-white')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-[11px] uppercase tracking-widest text-ink-400">
              {head.map((h, i) => (
                <th key={i} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">{children}</tbody>
        </table>
      </div>
      {empty}
    </Card>
  )
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-ink-300">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(total, page * pageSize)} of {total}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}

/** Confirmation dialog for destructive or account-affecting admin actions. */
export function ConfirmDialog({
  open, title, children, confirmLabel, danger, loading, onConfirm, onClose, requireText,
}: {
  open: boolean; title: string; children: React.ReactNode; confirmLabel: string; danger?: boolean; loading?: boolean
  onConfirm: () => void; onClose: () => void; requireText?: string
}) {
  const [typed, setTyped] = useState('')
  useEffect(() => {
    if (!open) setTyped('')
  }, [open])
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4 text-sm text-ink-200">
        {children}
        {requireText && (
          <div>
            <p className="mb-2 text-xs text-ink-300">Type <b className="text-white">{requireText}</b> to confirm</p>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} disabled={!!requireText && typed.trim() !== requireText} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function fmtDate(d: string | null | undefined, withTime = false) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, withTime ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' })
}
