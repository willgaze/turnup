import { cookies, headers } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'

const COOKIE = 'mts-session'

const secret = () => {
  const s = process.env.JWT_SECRET
  // Fail closed. No secret configured means nobody is an operator — never the
  // other way round, which is how auth checks usually go wrong.
  return s ? new TextEncoder().encode(s) : null
}

export async function createSession() {
  const key = secret()
  if (!key) throw new Error('JWT_SECRET is not set')
  const token = await new SignJWT({ role: 'operator' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key)
  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

/**
 * A token for the native app's lock screen. The Live Activity's buttons run in
 * the widget's own process, with no cookie jar, so the app stores one of these
 * in its App Group and the button sends it as `Authorization: Bearer`. Same
 * claims, same secret, same lifetime as the cookie; the app asks for a fresh
 * one each time it opens, so it never runs out on a working phone.
 */
export async function createNativeToken() {
  const key = secret()
  if (!key) throw new Error('JWT_SECRET is not set')
  const token = await new SignJWT({ role: 'operator', via: 'native' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key)
  return { token, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() }
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

/**
 * The one check for anything only the trade should see or do.
 * Every handler calls this itself — middleware is a convenience, never the
 * only lock.
 *
 * @returns {Promise<true | { error: string, status: number }>}
 */
export async function requireOperator() {
  const key = secret()
  if (!key) return { error: 'not_configured', status: 503 }

  const jar = await cookies()
  let token = jar.get(COOKIE)?.value
  // No cookie: a bearer token from the native app's lock-screen button.
  if (!token) {
    const auth = (await headers()).get('authorization') || ''
    if (auth.startsWith('Bearer ')) token = auth.slice(7).trim()
  }
  if (!token) return { error: 'unauthorised', status: 401 }

  try {
    await jwtVerify(token, key)
    return true
  } catch {
    return { error: 'unauthorised', status: 401 }
  }
}

export async function isOperator() {
  return (await requireOperator()) === true
}
