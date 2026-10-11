import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/api'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private organiser area stays out of crawlers entirely. Shared links (/live, /register, /bid)
        // are NOT disallowed here on purpose: link-preview bots (X, Slack, LinkedIn) honour robots.txt
        // and would then show a bare URL. Those pages carry `noindex` instead, which keeps them out
        // of search results while previews still work.
        disallow: ['/dashboard', '/t/', '/account', '/reset-password'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
