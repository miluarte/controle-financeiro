import type { MetadataRoute } from 'next'
import { SYSTEM_COLORS } from '@/lib/constants'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Troco — Controle financeiro',
    short_name: 'Troco',
    description: 'Controle financeiro pessoal',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: SYSTEM_COLORS.pageLight,
    theme_color: SYSTEM_COLORS.actionPrimary,
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
