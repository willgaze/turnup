'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellIcon, PlusIcon, ShareIcon } from '@/components/icons'
import { useStatusFetch } from './status-fetch'

/**
 * "Tell me when they set off."
 *
 * The point of the whole product, finally: the customer stops checking the
 * page because the page tells them.
 *
 * THE IPHONE CATCH, which is most of this component. On iOS, Safari in a tab
 * has no Notification API at all — not blocked, not prompting, absent. Web
 * push works only once the page has been added to the home screen, and then
 * only from that installed copy. So this cannot be a button that fails: it has
 * to notice it is in a tab on an iPhone and show the two-step how-to instead.
 * A button that does nothing when tapped is worse than no button.
 *
 * Everything here is decided after mount. The server has no navigator, no
 * Notification, and no idea whether this page is installed — anything guessed
 * during the server render is a hydration mismatch.
 */

/** The VAPID key travels as base64url and the browser wants raw bytes. */
function urlBase64ToUint8Array(base64) {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

/**
 * Whether push exists on this deployment at all.
 *
 * Exported because the row ABOVE this component has to know. Without keys
 * this component renders nothing, which used to leave a row on the page
 * titled "Tell me when they set off", promising "straight to your phone",
 * that opened onto an empty drawer. The gate has to be outside the drawer.
 *
 * NEXT_PUBLIC_* is inlined at build time, so this is the same value on the
 * server and in the browser and cannot tear the page.
 */
export const PUSH_CONFIGURED = Boolean(VAPID)

export default function Notify({ code }) {
  const statusFetch = useStatusFetch()
  // 'checking' until the browser has been asked what it can do.
  const [state, setState] = useState('checking')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const read = useCallback(async () => {
    if (!VAPID) return setState('unconfigured')

    const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    // Installed to the home screen? iOS answers on navigator.standalone;
    // everyone else on the display-mode media query.
    const installed =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches

    const capable =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

    if (!capable) return setState(isApple && !installed ? 'needs-install' : 'unsupported')
    if (Notification.permission === 'denied') return setState('blocked')

    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const existing = await reg.pushManager.getSubscription()
      setState(existing ? 'on' : 'off')
    } catch {
      setState('unsupported')
    }
  }, [])

  useEffect(() => { read() }, [read])

  const turnOn = async () => {
    setBusy(true); setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      })

      const r = await statusFetch(`/api/status/${code}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!r.ok) {
        // The browser is now subscribed to a push service we did not record,
        // which would leave it listening for a message that never comes. Undo
        // it rather than leave the customer thinking it is on.
        await sub.unsubscribe().catch(() => {})
        throw new Error('That did not save. Try again in a moment.')
      }
      setState('on')
    } catch (err) {
      // Browsers throw things like "Registration failed - permission denied"
      // and "AbortError". That is a message for whoever wrote this, not for
      // someone standing in a hallway with the water off, so the real one goes
      // to the console and they get a sentence.
      console.error('push subscribe failed:', err)
      setError(
        err?.message === 'That did not save. Try again in a moment.'
          ? err.message
          : 'Your phone would not let this page send notifications. Check notifications are allowed for it, then try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const turnOff = async () => {
    setBusy(true); setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await statusFetch(`/api/status/${code}/push`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
        await sub.unsubscribe()
      }
      setState('off')
    } catch {
      setError('Could not switch them off. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'checking' || state === 'unconfigured') return null

  return (
    <div>
      {state === 'off' && (
        <>
          <p className="text-[15px] leading-snug muted">
            Your phone will buzz when the job moves — set off, arrived, done. Nothing else, and
            nothing about the job goes on your lock screen.
          </p>
          <button type="button" onClick={turnOn} disabled={busy} className="btn btn-filled mt-4 w-full">
            <BellIcon size={19} />
            {busy ? 'One moment…' : 'Tell me when they set off'}
          </button>
        </>
      )}

      {state === 'on' && (
        <>
          <p className="text-[15px] leading-snug muted">
            You will be told when they set off, arrive, and finish. No arrival time is sent, because
            nobody can promise one.
          </p>
          <button type="button" onClick={turnOff} disabled={busy} className="btn btn-grey mt-4 w-full">
            {busy ? 'One moment…' : 'Stop telling me'}
          </button>
        </>
      )}

      {/* iPhone, in a tab. Not an error and not a failure — a missing step. */}
      {state === 'needs-install' && (
        <>
          <p className="text-[15px] leading-snug muted">
            iPhone can do this, but only once this page is on your home screen. Two taps:
          </p>
          <ol className="mt-4 space-y-3">
            <li className="flex items-center gap-3">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl"
                    style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 13%, transparent)' }}>
                <ShareIcon size={18} />
              </span>
              <span className="text-[15px]">Tap Share at the bottom of Safari</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl"
                    style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 13%, transparent)' }}>
                <PlusIcon size={18} />
              </span>
              <span className="text-[15px]">Then <strong>Add to Home Screen</strong></span>
            </li>
          </ol>
          <p className="mt-4 text-[14px]" style={{ color: 'var(--label-3)' }}>
            Open it from there and this button will work.
          </p>
        </>
      )}

      {state === 'blocked' && (
        <p className="text-[15px] leading-snug muted">
          Notifications are switched off for this page in your phone&rsquo;s settings. Turn them back
          on there and reopen this page.
        </p>
      )}

      {state === 'unsupported' && (
        <p className="text-[15px] leading-snug muted">
          This browser cannot do notifications. The page still updates itself while it is open.
        </p>
      )}

      {error && (
        <p className="r-inner mt-3 p-3 text-[14px]"
           style={{ background: 'color-mix(in srgb, #ff3b30 12%, transparent)', color: '#ff3b30' }}>
          {error}
        </p>
      )}
    </div>
  )
}
