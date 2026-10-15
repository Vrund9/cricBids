import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BidWicket — Cricket Player Auctions',
    short_name: 'BidWicket',
    description: 'Run live cricket player auctions for your tournament.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#080b13',
    theme_color: '#080b13',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
