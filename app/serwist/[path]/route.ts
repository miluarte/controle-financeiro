import { createSerwistRoute } from '@serwist/turbopack'
import { spawnSync } from 'node:child_process'

// Usado como chave de revisão do fallback offline no precache.
const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout.trim() ||
  crypto.randomUUID()

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: '/~offline', revision }],
  swSrc: 'app/sw.ts',
  useNativeEsbuild: true,
})
