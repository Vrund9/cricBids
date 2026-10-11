"use client"
import { ThemeProvider } from 'next-themes'
import { AppShell } from './app-shell'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import React from 'react'
import { Toaster } from 'react-hot-toast'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || '')

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ConvexProvider client={convex}>
        <AppShell>
          {children}
          <Toaster position="top-right" toastOptions={{ className: 'text-sm', style: { background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' } }} />
        </AppShell>
      </ConvexProvider>
    </ThemeProvider>
  )
}
