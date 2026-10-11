"use client"
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const schema = yup.object({
  name: yup.string().required('Name is required').max(80),
  email: yup.string().email('Invalid email').required('Email is required'),
  subject: yup.string().required('Subject is required').max(120),
  message: yup.string().required('Message is required').max(1200)
})

interface FormValues { name: string; email: string; subject: string; message: string }

export default function ContactForm(){
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle')
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: yupResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setStatus('sending')
    try {
      const res = await fetch('/contact/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if(!res.ok) throw new Error('Failed')
      setStatus('sent')
      reset()
      setTimeout(()=> setStatus('idle'), 4000)
    } catch(err){
      console.error(err)
      setStatus('error')
      setTimeout(()=> setStatus('idle'), 4000)
    }
  }

  let label = 'Send Message'
  if(status==='sending') label = 'Sending...'
  else if(status==='sent') label = 'Sent!'
  else if(status==='error') label = 'Error. Retry?'
  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      <div className='grid md:grid-cols-2 gap-6'>
        <div className='space-y-2'>
          <Label htmlFor='name' className={cn(errors.name && 'text-red-600 dark:text-red-400')}>Name</Label>
          <Input id='name' placeholder='Your name' {...register('name')} aria-invalid={!!errors.name} className={cn(errors.name && 'border-red-500 focus-visible:ring-red-500')} />
          {errors.name && <p className='text-xs text-red-600 dark:text-red-400'>{errors.name.message}</p>}
        </div>
        <div className='space-y-2'>
          <Label htmlFor='email' className={cn(errors.email && 'text-red-600 dark:text-red-400')}>Email</Label>
          <Input id='email' type='email' placeholder='you@example.com' {...register('email')} aria-invalid={!!errors.email} className={cn(errors.email && 'border-red-500 focus-visible:ring-red-500')} />
          {errors.email && <p className='text-xs text-red-600 dark:text-red-400'>{errors.email.message}</p>}
        </div>
      </div>
      <div className='space-y-2'>
        <Label htmlFor='subject' className={cn(errors.subject && 'text-red-600 dark:text-red-400')}>Subject</Label>
        <Input id='subject' placeholder='Subject' {...register('subject')} aria-invalid={!!errors.subject} className={cn(errors.subject && 'border-red-500 focus-visible:ring-red-500')} />
        {errors.subject && <p className='text-xs text-red-600 dark:text-red-400'>{errors.subject.message}</p>}
      </div>
      <div className='space-y-2'>
        <Label htmlFor='message' className={cn(errors.message && 'text-red-600 dark:text-red-400')}>Message</Label>
        <textarea id='message' className={cn('min-h-[160px] resize-y flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', errors.message && 'border-red-500 focus-visible:ring-red-500')} placeholder='Type your message...' {...register('message')} aria-invalid={!!errors.message} />
        {errors.message && <p className='text-xs text-red-600 dark:text-red-400'>{errors.message.message}</p>}
      </div>
      <div className='flex items-center gap-4'>
        <Button type='submit' disabled={status==='sending'}>{label}</Button>
        {status==='sent' && <span className='text-xs text-green-600 dark:text-green-400'>Your message has been sent.</span>}
        {status==='error' && <span className='text-xs text-red-600 dark:text-red-400'>Failed to send.</span>}
      </div>
    </form>
  )
}
