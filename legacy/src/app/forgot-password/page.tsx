'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useAction, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestReset = useMutation(api.auth.requestPasswordReset)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    if(!email){ setError('Email required'); toast.error('Email required'); return }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setError('Invalid email'); toast.error('Invalid email'); return }
    try {
      const p = requestReset({ email } as any)
      toast.promise(p,{ loading:'Sending...', success:'Reset link sent (if account exists)', error:(e:any)=> e.message||'Error' })
      await p
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <div className="hidden lg:flex relative w-1/2 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.25),transparent_70%)] border-r">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="relative z-10 max-w-md p-8 text-center space-y-6">
          <div className="text-6xl">🔐</div>
          <h2 className="text-3xl font-semibold tracking-tight">Reset Access</h2>
          <p className="text-sm text-muted-foreground">Securely regain access to your auction management account.</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-md border p-3 bg-background/40 backdrop-blur-sm"><p className="font-semibold">Secure</p><p className="text-muted-foreground">Process</p></div>
            <div className="rounded-md border p-3 bg-background/40 backdrop-blur-sm"><p className="font-semibold">No</p><p className="text-muted-foreground">Downtime</p></div>
            <div className="rounded-md border p-3 bg-background/40 backdrop-blur-sm"><p className="font-semibold">Fast</p><p className="text-muted-foreground">Recovery</p></div>
          </div>
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle>Password Reset</CardTitle>
            <CardDescription>We will send a reset link to your email</CardDescription>
          </CardHeader>
          <CardContent>
            {!submitted ? (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@example.com" />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full">Send Reset Link</Button>
              </form>
            ) : (
              <div className="space-y-4 text-sm">
                <p>Check your inbox for a password reset link. If it does not arrive, verify the email or try again.</p>
                <Button asChild variant="outline" className="w-full"><Link href="/login">Back to Login</Link></Button>
              </div>
            )}
          </CardContent>
          {!submitted && (
            <CardFooter className="text-xs text-muted-foreground">
              <span>Remembered? <Link href="/login" className="underline hover:text-foreground">Log in</Link></span>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  )
}
