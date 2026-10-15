'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'

type Theme = 'light' | 'dark'

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'light' ? '#f4f6fa' : '#080b13')
  try {
    localStorage.setItem('cricbid.theme', theme)
  } catch {}
}

/** Sun/moon switch. The initial theme is applied by the inline script in the root layout. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setLocal] = useState<Theme | null>(null)
  useEffect(() => setLocal(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'), [])
  const next: Theme = theme === 'light' ? 'dark' : 'light'
  return (
    <button
      type="button"
      onClick={() => {
        setTheme(next)
        setLocal(next)
      }}
      className={cn('grid h-9 w-9 place-items-center rounded-xl text-ink-200 transition-colors hover:bg-white/5 hover:text-white', className)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {/* Rendered after mount so the icon matches the theme the script chose. */}
      {theme === null ? <span className="h-4 w-4" /> : theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  )
}
