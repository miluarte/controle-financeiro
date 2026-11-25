import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import { SerwistProvider } from '@serwist/turbopack/react'
import './globals.css'
import { AppShell } from '@/components/layout/app-shell'
import { Providers } from './providers'
import { AuthGate } from '@/components/auth/auth-gate'
import { SYSTEM_COLORS } from '@/lib/constants'

// Fonte do app (Manrope, variável). Exposta como --font-family-manrope e usada pelo token --font-sans.
const manrope = Manrope({ subsets: ['latin'], variable: '--font-family-manrope', display: 'swap' })

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
    // barra de status opaca, na cor da página (theme-color / fundo). Não usar 'black-translucent':
    // no iOS 26.1+ o sistema desenha um borrado (efeito de borda do Liquid Glass) por cima do topo do
    // app instalado e a página não consegue desligar. Mudar isto só vale depois de reinstalar o app.
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
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: SYSTEM_COLORS.pageLight },
    { media: '(prefers-color-scheme: dark)', color: SYSTEM_COLORS.pageDark },
  ],
}

// Altura do AppShell = área que o navegador realmente desenha (innerHeight), medida antes da
// primeira pintura e a cada mudança. Assim a barra de abas nunca fica fora da tela, mesmo quando
// o iPhone, com o app na Tela de Início, entrega uma área menor que a tela (WebKit 301108).
const APP_HEIGHT_SCRIPT = `(function(){var d=document.documentElement;function s(){d.style.setProperty('--app-height',window.innerHeight+'px')}s();addEventListener('resize',s);addEventListener('pageshow',s);addEventListener('orientationchange',function(){setTimeout(s,300)});if(window.visualViewport)visualViewport.addEventListener('resize',s)})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} h-full`} suppressHydrationWarning>
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
