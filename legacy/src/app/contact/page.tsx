import React from 'react'
import ContactForm from './contact-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the Cricket Auction team. Send us your questions, feedback, or partnership inquiries.',
  openGraph: {
    title: 'Contact Us | Cricket Auction',
    description: 'Reach out to the Cricket Auction platform team with your inquiries.'
  }
}

export default function ContactPage(){
  return (
    <div className='max-w-3xl mx-auto py-12 space-y-8'>
      <div className='text-center space-y-2'>
        <h1 className='text-3xl font-bold'>Contact Us</h1>
        <p className='text-sm text-muted-foreground'>Have a question about the auction platform? Send us a message.</p>
      </div>
      <ContactForm />
      <div className='text-center text-[11px] text-muted-foreground'>We usually respond within 24 hours.</div>
    </div>
  )
}
