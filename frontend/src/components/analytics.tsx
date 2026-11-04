'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Analytics as VercelAnalytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { GA_ID, isTokenPath, redactUrl } from '@/lib/analytics'

/**
 * Vercel Web Analytics + Speed Insights (cookie-free), plus Google Analytics 4 when NEXT_PUBLIC_GA_ID
 * is set. Every URL is redacted first so private share-link tokens never reach an analytics provider.
 */
export function Analytics() {
  return (
    <>
      <VercelAnalytics beforeSend={(e) => ({ ...e, url: redactUrl(e.url) })} />
      <SpeedInsights beforeSend={(e) => ({ ...e, url: redactUrl(e.url) })} />
      {GA_ID && <GoogleAnalytics id={GA_ID} />}
    </>
  )
}

function GoogleAnalytics({ id }: { id: string }) {
  const pathname = usePathname()
  // Not loaded at all when the visit starts on a share link (owners' paddles, the projector screen).
  const [enabled] = useState(() => !isTokenPath(pathname))

  useEffect(() => {
    if (!enabled) return
    window.dataLayer = window.dataLayer || []
    window.gtag = window.gtag || function gtag() { window.dataLayer!.push(arguments) } // eslint-disable-line prefer-rest-params
    const location = redactUrl(window.location.origin + pathname)
    window.gtag('set', { page_location: location })
    window.gtag('event', 'page_view', { page_location: location, page_title: document.title })
  }, [enabled, pathname])

  if (!enabled) return null
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=window.gtag||gtag;gtag('js',new Date());gtag('config','${id}',{send_page_view:false});`}
      </Script>
    </>
  )
}
