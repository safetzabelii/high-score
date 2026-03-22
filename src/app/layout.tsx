import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter, JetBrains_Mono, DM_Serif_Display } from 'next/font/google'
import { Toaster } from 'sonner'
import Navbar from '../components/navbar'
import { NavigationProgress } from '@/components/shared/NavigationProgress'
import { ServiceWorkerRegistrar } from '@/components/shared/ServiceWorkerRegistrar'
import './globals.css'
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['700'],
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400'],
})

export const metadata: Metadata = {
  title: 'HIGH-SCORE',
  description: 'Your gaming community — Track games you play. Save those you want to try.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#14181C" />
        <link rel="icon" href="/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${dmSerif.variable} font-sans bg-zinc-950 text-zinc-100 antialiased`}>
        <NavigationProgress />
        <Suspense><Navbar /></Suspense>
        <main className="min-h-[calc(100vh-4.5rem)]">{children}</main>
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: {
              background: '#1B2028',
              border: '1px solid #283038',
              color: '#D8E0E8',
            },
          }}
        />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}