"use client"
import { useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

export default function ChangePasswordPage(){
	const stored = typeof window !== 'undefined' ? localStorage.getItem('ca_user') : null
	const parsed = stored ? JSON.parse(stored) : null
	const userId = parsed?.id
	const changePassword = useAction((api as any).auth.changePassword)
	const [showCurrent,setShowCurrent] = useState(false)
	const [showNew,setShowNew] = useState(false)
	const [showConfirm,setShowConfirm] = useState(false)
	const [newPassword,setNewPassword] = useState('')
	const [confirm,setConfirm] = useState('')
	const [loading,setLoading] = useState(false)
	const [error,setError] = useState<string| null>(null)

	const match = !confirm || newPassword === confirm

	const onSubmit = async (e:React.FormEvent<HTMLFormElement>)=>{
		e.preventDefault()
		setError(null)
		if(!userId){ toast.error('Not logged in'); setError('Not logged in'); return }
		const fd = new FormData(e.currentTarget)
		const currentPassword = fd.get('currentPassword') as string
		if(newPassword.length < 8){ const msg='Password must be at least 8 characters'; toast.error(msg); setError(msg); return }
		if(newPassword !== confirm){ const msg='Passwords do not match'; toast.error(msg); setError(msg); return }
		setLoading(true)
		try {
			const p = changePassword({ userId, currentPassword, newPassword } as any)
			toast.promise(p,{ loading:'Changing...', success:'Password changed', error:(e:any)=> e.message||'Error'})
			await p
			setNewPassword('')
			setConfirm('')
			;(e.currentTarget as HTMLFormElement).reset()
		} catch(err:any){ setError(err.message); toast.error(err.message) } finally { setLoading(false) }
	}

	return (
		<div className="min-h-[60vh] flex items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
				<CardContent>
					<form onSubmit={onSubmit} className="space-y-5">
						<div className="grid gap-1">
							<Label htmlFor="currentPassword">Current Password</Label>
							<div className="relative">
								<Input id="currentPassword" name="currentPassword" placeholder="••••••••" type={showCurrent? 'text':'password'} required className="pr-10" />
								<button type="button" onClick={()=>setShowCurrent(s=>!s)} className="absolute inset-y-0 right-0 flex items-center pr-3">
									{showCurrent ? <Eye className="h-5 w-5 text-muted-foreground" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
								</button>
							</div>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="newPassword">New Password</Label>
							<div className="relative">
								<Input id="newPassword" name="newPassword" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="••••••••" type={showNew? 'text':'password'} required className="pr-10" />
								<button type="button" onClick={()=>setShowNew(s=>!s)} className="absolute inset-y-0 right-0 flex items-center pr-3">
									{showNew ? <Eye className="h-5 w-5 text-muted-foreground" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
								</button>
							</div>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="confirm">Confirm New Password</Label>
							<div className="relative">
								<Input id="confirm" name="confirm" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" type={showConfirm? 'text':'password'} required className={match? 'pr-10':'pr-10 border-destructive focus-visible:ring-destructive'} />
								<button type="button" onClick={()=>setShowConfirm(s=>!s)} className="absolute inset-y-0 right-0 flex items-center pr-3">
									{showConfirm ? <Eye className="h-5 w-5 text-muted-foreground" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
								</button>
							</div>
							{!match && <p className="text-[11px] text-destructive text-red-500">Passwords do not match.</p>}
							{error && <p className="text-[11px] text-destructive text-red-500">{error}</p>}
						</div>
						<Button type="submit" disabled={loading || !match || newPassword.length < 8} className="w-full flex items-center justify-center gap-2">
							{loading && <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
							{loading? 'Saving...' : 'Change Password'}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
