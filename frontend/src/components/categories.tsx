'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Layers, Plus, Users, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export const DEFAULT_CATEGORIES = ['A', 'B', 'C']
const PRESETS = [['A', 'B', 'C'], ['MARQUEE', 'A', 'B', 'C'], ['GOLD', 'SILVER', 'BRONZE']]

export interface CategoryChoice {
  useCategories: boolean
  categoryList: string[]
}

/**
 * "Are players grouped into categories?" — two radio cards, and the category list when the
 * answer is yes. Used when creating a tournament and in its details.
 */
export function CategoryModePicker({ value, onChange, disabled }: { value: CategoryChoice; onChange: (v: CategoryChoice) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState('')
  const list = value.categoryList
  const add = () => {
    const names = draft.split(',').map((c) => c.trim().toUpperCase().slice(0, 30)).filter(Boolean)
    const next = [...new Set([...list, ...names])].slice(0, 20)
    if (names.length) onChange({ ...value, categoryList: next })
    setDraft('')
  }
  const options = [
    { on: false, icon: Users, title: 'Without categories', text: 'Every player in one pool at the same base price.' },
    { on: true, icon: Layers, title: 'Category-wise', text: 'Group players (A, B, C…) with their own base prices and auction order.' },
  ]

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="How are players grouped?">
        {options.map((o) => {
          const active = value.useCategories === o.on
          return (
            <button
              key={o.title}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange({ useCategories: o.on, categoryList: o.on && !list.length ? DEFAULT_CATEGORIES : list })}
              className={cn('flex gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50', active ? 'border-lime-glow/60 bg-lime-glow/[0.06]' : 'border-white/10 hover:border-white/25')}
            >
              <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2', active ? 'border-lime-glow' : 'border-ink-400')}>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-lime-glow" />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold"><o.icon className="h-3.5 w-3.5 text-ink-300" /> {o.title}</span>
                <span className="mt-0.5 block text-xs text-ink-400">{o.text}</span>
              </span>
            </button>
          )
        })}
      </div>

      <AnimatePresence initial={false}>
        {value.useCategories && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="mb-2 text-xs font-semibold text-ink-300">Categories</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {list.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-lg border border-gold/30 bg-gold/10 py-1 pl-2.5 pr-1 text-xs font-bold text-gold">
                    {c}
                    {!disabled && list.length > 1 && (
                      <button type="button" className="rounded p-0.5 hover:bg-white/10" onClick={() => onChange({ ...value, categoryList: list.filter((x) => x !== c) })} aria-label={`Remove category ${c}`}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
                {!disabled && (
                  <span className="inline-flex items-center gap-1">
                    <input
                      value={draft}
                      maxLength={60}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          add()
                        }
                      }}
                      onBlur={add}
                      placeholder="Add category"
                      aria-label="Add category"
                      className="h-7 w-28 rounded-lg border border-white/10 bg-transparent px-2 text-xs uppercase placeholder:normal-case placeholder:text-ink-400 focus:border-lime-glow/60 focus:outline-none"
                    />
                    <button type="button" onClick={add} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-ink-300 hover:text-white" aria-label="Add">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
              {!disabled && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-400">
                  Quick pick:
                  {PRESETS.map((p) => (
                    <button key={p.join()} type="button" onClick={() => onChange({ ...value, categoryList: p })} className="rounded-md border border-white/10 px-1.5 py-0.5 hover:border-white/25 hover:text-white">
                      {p.join(' · ')}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-2.5 text-[11px] text-ink-400">The player list, registration form and Excel template will ask for one of these.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
