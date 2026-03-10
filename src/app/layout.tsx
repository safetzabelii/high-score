import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import Navbar from '../components/navbar'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GameApp',
  description: 'Your gaming community',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-50 antialiased`}>
        <Navbar />
        <main>{children}</main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}