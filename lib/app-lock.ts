// Bloqueio do app com Face ID (spec v2). Usa a biometria do aparelho via WebAuthn: o app cria
// uma chave no iPhone e, para destravar, pede que o Face ID confirme o uso dela.
// É uma trava local deste aparelho; o login continua sendo o do Supabase.

const key = (userId: string) => `troco-lock:${userId}`

const random = () => crypto.getRandomValues(new Uint8Array(32))
const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))

export async function lockSupported() {
  try {
    return !!window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function lockCredential(userId: string): string | null {
  try { return localStorage.getItem(key(userId)) } catch { return null }
}

export async function enableLock(userId: string, name: string) {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: random(),
      rp: { name: 'Troco', id: location.hostname },
      user: { id: new TextEncoder().encode(userId), name: name || 'Troco', displayName: name || 'Troco' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
    },
  }) as PublicKeyCredential | null
  if (!cred) throw new Error('Face ID não foi configurado.')
  localStorage.setItem(key(userId), toB64(cred.rawId))
}

export function disableLock(userId: string) {
  try { localStorage.removeItem(key(userId)) } catch { /* sem armazenamento */ }
}

export async function unlock(userId: string) {
  const id = lockCredential(userId)
  if (!id) return true
  const cred = await navigator.credentials.get({
    publicKey: {
      challenge: random(),
      allowCredentials: [{ type: 'public-key', id: fromB64(id), transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000,
    },
  })
  return !!cred
}
