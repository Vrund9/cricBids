'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useRouter } from 'next/navigation'

const signupSchema = yup.object({
  name: yup.string().min(2,'Name too short').required('Name required'),
  email: yup.string().email('Invalid email').required('Email required'),
  password: yup.string().min(8,'Min 8 chars').matches(/[A-Z]/,'1 uppercase').matches(/[a-z]/,'1 lowercase').matches(/\d/,'1 number').required('Password required'),
  confirm: yup.string().oneOf([yup.ref('password')], 'Passwords do not match').required('Confirm required')
})

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<{name:string;email:string;password:string;confirm:string}>({ resolver: yupResolver(signupSchema) })
  const router = useRouter()
  const signup = useAction((api as any).auth.signup)
  const onSubmit = async ({ name, email, password }: {name:string;email:string;password:string}) => {
    setError(null); setLoading(true)
    try {
      const p = signup({ name, email, password } as any)
      toast.promise(p,{ loading:'Creating account...', success:'Account created!', error:(e:any)=> e.message || 'Failed'})
      const res:any = await p
      if(res?.userId){ localStorage.setItem('ca_user', JSON.stringify({ id: res.userId, name })); router.push('/') }
    } catch(err:any){ setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <div className="hidden lg:flex relative w-1/2 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.25),transparent_70%)] border-r">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="relative z-10 max-w-md p-8 text-center space-y-6">
          <div className="text-6xl">🔥</div>
          <h2 className="text-3xl font-semibold tracking-tight">Create Your Auction</h2>
          <p className="text-sm text-muted-foreground">Register to configure teams, upload players, and launch immersive live bidding sessions.</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-md border p-3 bg-background/40 backdrop-blur-sm"><p className="font-semibold">Custom</p><p className="text-muted-foreground">Teams</p></div>
            <div className="rounded-md border p-3 bg-background/40 backdrop-blur-sm"><p className="font-semibold">Smart</p><p className="text-muted-foreground">Rotation</p></div>
            <div className="rounded-md border p-3 bg-background/40 backdrop-blur-sm"><p className="font-semibold">Dark</p><p className="text-muted-foreground">Theme</p></div>
          </div>
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Start hosting cricket auctions</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" autoComplete="name" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive text-red-500">{errors.name.message}</p>}
              </div>
              <div className="grid gap-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive text-red-500">{errors.email.message}</p>}
              </div>
              <div className="grid gap-1">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPw? 'text':'password'} placeholder="••••••••" autoComplete="new-password" {...register('password')} />
                  <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3" onClick={()=>setShowPw(p=>!p)}>
                    {showPw? <Eye className="h-5 w-5 text-muted-foreground" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive text-red-500">{errors.password.message}</p>}
              </div>
              <div className="grid gap-1">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Input id="confirm" type={showPw2? 'text':'password'} placeholder="••••••••" autoComplete="new-password" {...register('confirm')} />
                  <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3" onClick={()=>setShowPw2(p=>!p)}>
                    {showPw2? <Eye className="h-5 w-5 text-muted-foreground" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                  </button>
                </div>
                {errors.confirm && <p className="text-xs text-destructive text-red-500">{errors.confirm.message}</p>}
              </div>
              {error && <p className="text-xs text-destructive text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>{loading? 'Creating...' : 'Sign Up'}</Button>
            </form>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            <span>Already have an account? <Link href="/login" className="underline hover:text-foreground">Log in</Link></span>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
