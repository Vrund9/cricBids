"use client"
import { useEffect, useState, useRef } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Globe, Mail, Camera, ThumbsUp, X as XIcon } from 'lucide-react'

export default function ProfilePage(){
  const [bootstrapped, setBootstrapped] = useState(false)
  const [userMeta, setUserMeta] = useState<{ id:string; name?:string; avatarUrl?:string } | null>(null)
  useEffect(()=>{ try { const raw = localStorage.getItem('ca_user'); if(raw) setUserMeta(JSON.parse(raw)) } catch{} setBootstrapped(true) },[])

  const userId = userMeta?.id
  const user = useQuery((api as any).auth.getUser, userId ? { userId } : undefined)
  const update = useMutation((api as any).auth.updateProfile)

  const [form, setForm] = useState({
    name: '', avatarUrl:'', bio:'', instagram:'', twitter:'', facebook:'', website:'', currency:'INR'
  })
  useEffect(()=>{ if(user){ setForm({
    name: user.name||'', avatarUrl:user.avatarUrl||'', bio:user.bio||'', instagram:user.instagram||'', twitter:user.twitter||'', facebook:user.facebook||'', website:user.website||'', currency: user.currency || 'INR'
  }) } },[user])

  const fileInputRef = useRef<HTMLInputElement|null>(null)
  const [localImage, setLocalImage] = useState<string|undefined>()
  const [imageError,setImageError] = useState(false)

  if(!bootstrapped) return null
  if(!userId) return <p className="text-sm">Please <Link href="/login" className="underline">login</Link>.</p>
  if(user === undefined) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-24 w-24 rounded-full ring-1 ring-border flex items-center justify-center bg-background/40">
            <span className="text-3xl font-medium">{(userMeta?.name||'U').charAt(0).toUpperCase()}</span>
          </div>
          <div className="absolute inset-0 animate-ping rounded-full ring-1 ring-border" />
        </div>
        <p className="text-sm text-muted-foreground">Loading profile...</p>
      </div>
    </div>
  )

  const onFieldChange = (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => {
    setForm(f=>({...f,[e.target.name]:e.target.value}))
  }

  const onSelectImage = (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if(!file) return
    if(!file.type.startsWith('image/')){ toast.error('Select an image'); return }
    if(file.size > 1024*1024*2){ toast.error('Image too large (max 2MB)'); return }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setLocalImage(dataUrl)
      setForm(f=>({...f, avatarUrl: dataUrl }))
      // Persist immediately
      if(userId){
        try {
          const p = update({ userId, avatarUrl: dataUrl } as any)
          toast.promise(p,{ loading:'Updating avatar...', success:'Avatar updated', error:(e:any)=> e.message||'Error'})
          await p
          const existing = localStorage.getItem('ca_user')
          let current = existing? JSON.parse(existing): { id: userId, name: form.name || user?.name || 'User' }
            current.avatarUrl = dataUrl
          localStorage.setItem('ca_user', JSON.stringify(current))
          // Fire synthetic event so header updates immediately
          window.dispatchEvent(new Event('storage'))
        } catch(err:any){ toast.error(err.message) }
      }
    }
    reader.readAsDataURL(file)
  }

  const onSubmit = async (e:React.FormEvent) => {
    e.preventDefault()
    try {
      const p = update({ userId, ...form } as any)
      toast.promise(p,{ loading:'Saving...', success:'Profile updated', error:(e:any)=> e.message || 'Error'})
      await p
      const updated = { id:userId, name: form.name || userMeta?.name || 'User', avatarUrl: form.avatarUrl, currency: form.currency }
      localStorage.setItem('ca_user', JSON.stringify(updated))
      window.dispatchEvent(new StorageEvent('storage', { key:'ca_user' }))
      setUserMeta(updated)
    } catch(err:any){ toast.error(err.message) }
  }

  return (
    <div className="mt-6 flex flex-col lg:flex-row gap-8">
      {/* Left column */}
      <div className="w-full lg:w-64 space-y-6">
        <Card className="p-4 flex flex-col items-center text-center gap-4">
          <div className="relative">
            <div className="h-40 w-40 rounded-md ring-1 ring-border overflow-hidden bg-muted flex items-center justify-center">
              { (localImage || form.avatarUrl) && !imageError ? (
                <img
                  src={localImage || form.avatarUrl}
                  alt={form.name || 'Avatar'}
                  className="h-full w-full object-cover"
                  onError={()=>setImageError(true)}
                  draggable={false}
                />
              ) : (
                <span className="text-4xl font-medium text-muted-foreground">
                  {(form.name || user?.name || 'U').charAt(0).toUpperCase()}
                </span>
              ) }
            </div>
            <button
              type="button"
              onClick={()=>fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 rounded-md bg-background/90 backdrop-blur px-2 py-1 text-[10px] font-medium border hover:bg-accent hover:text-accent-foreground transition"
            >Change</button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ setImageError(false); onSelectImage(e) }} />
          </div>
          <div>
            <p className="font-semibold text-sm">{form.name || user?.name}</p>
            <p className="text-xs text-muted-foreground">Member since { new Date(user.createdAt).toLocaleDateString() }</p>
          </div>
          <div className="w-full text-left space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Bio</p>
              <p className="text-xs whitespace-pre-line min-h-[40px]">{form.bio || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Links</p>
              <ul className="text-xs space-y-1">
                {form.website && (
                  <li className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    <a href={form.website} className="underline break-all" target="_blank" rel="noreferrer">{form.website}</a>
                  </li>
                )}
                {form.instagram && (
                  <li className="flex items-center gap-2">
                    <Camera className="h-3 w-3 text-muted-foreground" />
                    <span>{form.instagram}</span>
                  </li>
                )}
                {form.twitter && (
                  <li className="flex items-center gap-2">
                    <XIcon className="h-3 w-3 text-muted-foreground" />
                    <span>{form.twitter}</span>
                  </li>
                )}
                {form.facebook && (
                  <li className="flex items-center gap-2">
                    <ThumbsUp className="h-3 w-3 text-muted-foreground" />
                    <span>{form.facebook}</span>
                  </li>
                )}
                {!(form.website||form.instagram||form.twitter||form.facebook) && <li className="text-muted-foreground">No links added</li>}
              </ul>
            </div>
          </div>
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Summary</p>
          <ul className="text-xs space-y-1">
            <li className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" /><span>{user.email}</span></li>
          </ul>
        </Card>
      </div>

      {/* Right column */}
      <div className="flex-1 space-y-6">
        <Card className="p-6">
          <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-2">
            <div className="grid gap-1 col-span-2 md:col-span-1">
              <label htmlFor="name" className="text-xs font-medium">Name</label>
              <Input id="name" name="name" value={form.name} onChange={onFieldChange} placeholder="Full name" />
            </div>
            <div className="grid gap-1 col-span-2 md:col-span-1">
              <label htmlFor="website" className="text-xs font-medium">Website</label>
              <Input id="website" name="website" value={form.website} onChange={onFieldChange} placeholder="https://" />
            </div>
            <div className="grid gap-1 col-span-2 md:col-span-1">
              <label htmlFor="currency" className="text-xs font-medium">Preferred Currency</label>
              <select
                id="currency"
                name="currency"
                value={form.currency}
                onChange={(e)=> setForm(f=>({...f, currency: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div className="grid gap-1 col-span-2">
              <label htmlFor="bio" className="text-xs font-medium">Bio</label>
              <Input id="bio" name="bio" value={form.bio} onChange={onFieldChange} placeholder="Short bio" />
            </div>
            <div className="grid gap-1">
              <label htmlFor="instagram" className="text-xs font-medium">Instagram</label>
              <Input id="instagram" name="instagram" value={form.instagram} onChange={onFieldChange} placeholder="@handle" />
            </div>
            <div className="grid gap-1">
              <label htmlFor="twitter" className="text-xs font-medium">Twitter</label>
              <Input id="twitter" name="twitter" value={form.twitter} onChange={onFieldChange} placeholder="@handle" />
            </div>
            <div className="grid gap-1">
              <label htmlFor="facebook" className="text-xs font-medium">Facebook</label>
              <Input id="facebook" name="facebook" value={form.facebook} onChange={onFieldChange} placeholder="Profile" />
            </div>
            <div className="col-span-2 flex justify-end">
              <Button type="submit" className="px-6">Save Changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
