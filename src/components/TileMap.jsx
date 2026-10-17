'use client'

import { useEffect, useRef, useState } from 'react'
import { PinIcon } from '@/components/icons'

/**
 * A map with a pin in the middle, and you move the map, not the pin.
 *
 * That is the Uber and Deliveroo pattern, and it is the right one on a phone:
 * a pin you have to grab is a 20px target under a thumb, and the thumb hides
 * it at exactly the moment you are trying to put it on a door. Dragging the
 * whole map under a fixed pin can be done with any part of the hand.
 *
 * Hand-rolled on OpenStreetMap's own tiles rather than a map library: it is
 * one pin, one zoom pair and a drag, which is ninety lines, and a library is a
 * dependency on a page a stranger opens before they have given us anything.
 * OSM's tile policy allows light use like this with the attribution shown,
 * which it is, bottom right, and never hidden.
 *
 * Nothing here asks for a location. The parent decides where the map starts
 * (a postcode, or a tap on "Use where I am"), the same rule as DropPin.
 */
const TILE = 256
const worldPx = (z) => TILE * 2 ** z

export function project(lat, lng, z) {
  const s = Math.sin((lat * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * worldPx(z),
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * worldPx(z),
  }
}

export function unproject(x, y, z) {
  const n = Math.PI - (2 * Math.PI * y) / worldPx(z)
  return {
    lat: (180 / Math.PI) * Math.atan(Math.sinh(n)),
    lng: (x / worldPx(z)) * 360 - 180,
  }
}

export default function TileMap({ lat, lng, onMove, zoom = 17, height = 240, interactive = true, className = '' }) {
  const box = useRef(null)
  const [w, setW] = useState(0)
  const [z, setZ] = useState(zoom)
  const [centre, setCentre] = useState(() => project(lat, lng, zoom))
  const drag = useRef(null)

  // A new starting point from outside (a postcode looked up, a GPS fix)
  // recentres the map. Our own drag reports back through onMove and comes
  // round again as props, so compare before moving to avoid a jump.
  useEffect(() => {
    const p = project(lat, lng, z)
    setCentre((c) => (Math.abs(c.x - p.x) > 0.5 || Math.abs(c.y - p.y) > 0.5 ? p : c))
  }, [lat, lng, z])

  useEffect(() => {
    if (!box.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])

  const report = (c, zz = z) => onMove?.(unproject(c.x, c.y, zz))

  const down = (e) => {
    if (!interactive) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, c: centre }
  }
  const move = (e) => {
    const d = drag.current
    if (!d) return
    setCentre({ x: d.c.x - (e.clientX - d.x), y: d.c.y - (e.clientY - d.y) })
  }
  const up = () => {
    if (!drag.current) return
    drag.current = null
    report(centre)
  }
  const zoomTo = (nz) => {
    const ll = unproject(centre.x, centre.y, z)
    const c = project(ll.lat, ll.lng, nz)
    setZ(nz)
    setCentre(c)
  }

  const left = centre.x - w / 2
  const top = centre.y - height / 2
  const max = 2 ** z
  const tiles = []
  if (w) {
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + w) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
        if (ty < 0 || ty >= max) continue
        const wx = ((tx % max) + max) % max
        tiles.push({ key: `${z}/${tx}/${ty}`, src: `https://tile.openstreetmap.org/${z}/${wx}/${ty}.png`, l: tx * TILE - left, t: ty * TILE - top })
      }
    }
  }

  return (
    <div ref={box}
         className={`relative select-none overflow-hidden r-inner bg-[#e8e4da] dark:bg-[#2a2b2f] ${interactive ? 'cursor-grab touch-none active:cursor-grabbing' : ''} ${className}`}
         style={{ height }}
         onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {tiles.map((t) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img key={t.key} src={t.src} alt="" draggable={false} width={TILE} height={TILE}
             className="pointer-events-none absolute max-w-none" style={{ left: t.l, top: t.t }} />
      ))}

      {/* The pin's point sits on the exact centre, which is the coordinate
          reported. The shadow dot marks the spot when the pin hides it. */}
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/30" />
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full drop-shadow-md"
            style={{ color: 'var(--tint)' }}>
        <svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43C17 43 2 26.5 2 16.5a15 15 0 0 1 30 0C32 26.5 17 43 17 43Z" fill="currentColor" stroke="#fff" strokeWidth="2.5" /><circle cx="17" cy="16.5" r="5.5" fill="#fff" /></svg>
      </span>

      {interactive && (
        <div className="absolute right-2 top-2 grid overflow-hidden r-inner bg-white/95 text-[#15161a] shadow">
          <button type="button" aria-label="Zoom in" className="h-9 w-9 text-[20px] leading-none"
                  onPointerDown={(e) => e.stopPropagation()} onClick={() => zoomTo(Math.min(19, z + 1))}>+</button>
          <span className="h-px bg-black/10" />
          <button type="button" aria-label="Zoom out" className="h-9 w-9 text-[20px] leading-none"
                  onPointerDown={(e) => e.stopPropagation()} onClick={() => zoomTo(Math.max(12, z - 1))}>−</button>
        </div>
      )}

      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
         onPointerDown={(e) => e.stopPropagation()}
         className="absolute bottom-0 right-0 bg-white/80 px-1.5 py-0.5 text-[10px] text-[#333]">
        © OpenStreetMap
      </a>
      {!interactive && <span className="sr-only"><PinIcon /> Map of the area with a pin</span>}
    </div>
  )
}
