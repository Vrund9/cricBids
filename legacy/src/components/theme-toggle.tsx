"use client"
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(()=> setMounted(true), [])
  if(!mounted) return null
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={()=> setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex items-center justify-center h-8 w-8 rounded-md border text-muted-foreground hover:text-foreground hover:bg-accent hover:border-accent transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
