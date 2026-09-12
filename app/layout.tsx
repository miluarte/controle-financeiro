import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { SerwistProvider } from '@serwist/turbopack/react'
import './globals.css'
import { AppShell } from '@/components/layout/app-shell'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Troco',
  description: 'Controle financeiro pessoal',
  applicationName: 'Troco',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Troco',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#171717',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full bg-background font-sans text-foreground">
        <SerwistProvider swUrl="/serwist/sw.js">
          <AppShell>{children}</AppShell>
        </SerwistProvider>
      </body>
    </html>
  )
}
