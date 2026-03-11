import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import Navbar from '../components/navbar'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ServiceWorkerRegistrar } from '@/components/shared/ServiceWorkerRegistrar'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['700'],
})

export const metadata: Metadata = {
  title: 'HIGH-SCORE',
  description: 'Your gaming community — Letterboxd for Games',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#09090b" />
        <link rel="icon" href="/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-zinc-950 text-zinc-50 antialiased noise`}>
        <ThemeProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--zinc-900)',
                border: '1px solid var(--zinc-800)',
                color: 'var(--zinc-50)',
              },
            }}
          />
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  )
}
