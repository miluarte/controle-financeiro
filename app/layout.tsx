import type { Metadata, Viewport } from 'next'
import { SerwistProvider } from '@serwist/turbopack/react'
import './globals.css'
import { AppShell } from '@/components/layout/app-shell'
import { Providers } from './providers'
import { AuthGate } from '@/components/auth/auth-gate'

export const metadata: Metadata = {
  title: 'Troco',
  description: 'Controle financeiro pessoal',
  applicationName: 'Troco',
  icons: {
    icon: [
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon_io/favicon.ico' },
    ],
    apple: { url: '/favicon_io/apple-touch-icon.png', sizes: '180x180' },
  },
  appleWebApp: {
    capable: true,
    // conteúdo passa por baixo da barra de status, como app nativo; o AppShell compensa com safe-area
    statusBarStyle: 'black-translucent',
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
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#030712' },
  ],
}

// Altura do AppShell = área que o navegador realmente desenha (innerHeight), medida antes da
// primeira pintura e a cada mudança. Assim a barra de abas nunca fica fora da tela, mesmo quando
// o iPhone, com o app na Tela de Início, entrega uma área menor que a tela (WebKit 301108).
const APP_HEIGHT_SCRIPT = `(function(){var d=document.documentElement;function s(){d.style.setProperty('--app-height',window.innerHeight+'px')}s();addEventListener('resize',s);addEventListener('pageshow',s);addEventListener('orientationchange',function(){setTimeout(s,300)});if(window.visualViewport)visualViewport.addEventListener('resize',s)})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APP_HEIGHT_SCRIPT }} />
      </head>
      <body className="h-full bg-background font-sans text-foreground">
        <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV !== 'production'}>
          <Providers>
            <AuthGate>
              <AppShell>{children}</AppShell>
            </AuthGate>
          </Providers>
        </SerwistProvider>
      </body>
    </html>
  )
}
