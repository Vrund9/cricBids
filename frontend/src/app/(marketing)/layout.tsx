import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

// Public marketing pages (SEO surface). Kept separate from the organiser app so it can be
// split into its own deployment later without touching product code.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  )
}
