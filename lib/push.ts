import { supabase, unwrap } from './supabase/client'

// Web Push (VAPID). No iPhone só funciona com o app instalado na Tela de Início (iOS 16.4+).

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function base64UrlToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

export async function pushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

export async function enablePush(userId: string) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permissão de notificação negada.')
  const key = unwrap(await supabase.rpc('get_vapid_public_key')) as string | null
  if (!key) throw new Error('O servidor de notificações ainda está sendo preparado. Tente de novo em alguns minutos.')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) })
  const json = sub.toJSON()
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  unwrap(await supabase.from('push_subscriptions').insert({
    user_id: userId, endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth,
  }))
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function sendTest() {
  unwrap(await supabase.rpc('send_test_notification'))
}
