'use client'

import { useEffect, useState } from 'react'
import { WalletIcon } from '@/components/icons'

/**
 * "Save to Google Wallet."
 *
 * The Android half of AddToWallet beside it, and it follows the same two
 * rules. Only drawn when the deployment can actually sign a Google pass (the
 * page checks that on the server and passes `googleReady`), and only on a
 * device that has Google Wallet -- decided after mount, so hydration is
 * untouched. A Google save link on an iPhone opens a web page that cannot add
 * anything, which is a button that does nothing.
 *
 * The href is our own route, not Google's: the link has to be signed per job
 * and is far too long to sit in the page, and routing through us means the
 * key never goes near a browser.
 */
export default function SaveToGoogle({ code }) {
  const [android, setAndroid] = useState(false)
  useEffect(() => {
    const ua = navigator.userAgent
    setAndroid(/Android/.test(ua) && !/iPhone|iPad|Macintosh/.test(ua))
  }, [])
  if (!android) return null
  return (
    <a href={`/api/wallet/google/${code}`}
       className="mt-3 flex items-center justify-center gap-2.5 rounded-2xl bg-black px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm active:scale-[.99]">
      <WalletIcon size={21} />
      Save to Google Wallet
    </a>
  )
}
