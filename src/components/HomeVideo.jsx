'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

/**
 * The customer's card going round, on the homepage, inside the phone.
 *
 * Thirteen silent seconds of /demo moving Booked in -> On my way -> On site
 * -> Job done, filmed by scripts/record-social.mjs (public/video/). It is
 * there so a stranger gets the product in the time it takes to read the
 * headline beside it, without a paragraph.
 *
 * What it costs the page, and how each cost is kept down:
 *   - Nothing is fetched until the phone is near the viewport: the <source>
 *     tags are only rendered once an IntersectionObserver says so, and
 *     `preload="none"` covers the moment between. The two files are about
 *     150 KB each.
 *   - The first frame is a real image (next/image, priority), so the
 *     largest paint is the same kind of thing it was before the film and
 *     nothing shifts when the video arrives: it fades in over the still
 *     once it is actually playing.
 *   - prefers-reduced-motion gets the still and no video element at all.
 *   - Muted, looped, playsinline: it never asks for sound, never goes full
 *     screen on an iPhone, and autoplays under every browser's rules for a
 *     muted film. If autoplay is refused the still stays.
 *
 * It shows only what is live. There is no wallet card in it, and nothing in
 * it counts down: the stages move because the trade tapped, which is the
 * whole product.
 */
export default function HomeVideo({ alt }) {
  const ref = useRef(null)
  const [near, setNear] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (mq?.matches) { setStill(true); return }
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { setNear(true); return }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect() }
    }, { rootMargin: '200px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className="absolute inset-0">
      <Image src="/video/customer-card.jpg" alt={alt} width={780} height={1688} priority sizes="220px"
             className="absolute inset-0 block h-auto w-full" />
      {!still && (
        <video autoPlay muted loop playsInline preload="none" poster="/video/customer-card.jpg"
               aria-label={alt} onPlaying={() => setPlaying(true)}
               className="absolute inset-0 block h-auto w-full transition-opacity duration-500"
               style={{ opacity: playing ? 1 : 0 }}>
          {near && <source src="/video/customer-card.webm" type="video/webm" />}
          {near && <source src="/video/customer-card.mp4" type="video/mp4" />}
        </video>
      )}
    </div>
  )
}
