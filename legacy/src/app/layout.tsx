import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from '@/components/providers'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cricket Auction - Build Your Dream Team",
    template: "%s | Cricket Auction"
  },
  description: "Experience the ultimate cricket auction platform. Create teams, bid strategically, and build your dream cricket squad.",
  keywords: ["cricket auction", "fantasy cricket", "team building", "cricket players", "sports auction", "online auction", "contact", "support"],
  authors: [{ name: "Cricket Auction Team" }],
  openGraph: {
    title: "Cricket Auction - Build Your Dream Team",
    description: "Experience the ultimate cricket auction platform",
    type: "website",
    siteName: "Cricket Auction"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  metadataBase: (()=> {
    try {
      const raw = process.env.NEXT_PUBLIC_SITE_URL
      if(raw && /^https?:\/\//i.test(raw)) return new URL(raw)
    } catch(_) { /* ignore invalid */ }
    return new URL('http://localhost:3000')
  })()
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
