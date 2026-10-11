'use client'

import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{ style: { background: '#111622', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f5fa' } }}
        />
      </AuthProvider>
    </MotionConfig>
  )
}
