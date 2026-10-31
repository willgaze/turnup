'use client'

import { useEffect, useState } from 'react'
import { normaliseW3w, normaliseMapPin, w3wUrl } from '@/lib/places'
import { readOwn, writeOwn } from './own-answers'
import DropPin from '@/components/DropPin'
import FindWords from '@/components/FindWords'
import { useStatusFetch } from './status-fetch'

const DOORS = [
  { key: 'FRONT', label: 'Front' },
  { key: 'BACK', label: 'Back' },
  { key: 'SIDE', label: 'Side' },
]

/**
 * The customer telling the trade how to actually get to them.
 *
 * Every one of these is something that costs a real visit when it is missing:
 * a farm track with no house number, a gate that only opens from the inside, a
 * dog that needs shutting in the kitchen first, a van that cannot get past the
 * parked cars before nine.
 *
 * There is deliberately no field for a key safe code, and the page says so.
 * People will type one in if you let them, and this is a link sent by text.
 */
export default function AccessNotes({ status, onSaved }) {
  const statusFetch = useStatusFetch()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [door, setDoor] = useState(null)
  const [pets, setPets] = useState(false)
  const [w3w, setW3w] = useState('')
  const [pin, setPin] = useState('')
  const [notes, setNotes] = useState('')

  // Prefilled from this device, not from the server. The trade has all of it;
  // the page does not hand it back, because a tracking link gets forwarded and
  // "the gate sticks, park on the verge" is not for whoever it reaches. See
  // ./own-answers.js. Read after mount — the server has no localStorage, and a
  // value guessed during the server render is a hydration mismatch.
  useEffect(() => {
    const mine = readOwn(status.code)
    setDoor(mine.doorToUse || null)
    setPets(Boolean(mine.petsOnSite))
    setW3w(mine.what3words || '')
    setPin(mine.mapPin || '')
    setNotes(mine.accessNotes || '')
  }, [status.code])

  const anything = door || pets || w3w || pin || notes

  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      const r = await statusFetch(`/api/status/${status.code}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doorToUse: door, petsOnSite: pets, what3words: w3w, mapPin: pin, accessNotes: notes }),
      })
      if (r.ok) {
        onSaved?.(writeOwn(status.code, {
          doorToUse: door, petsOnSite: pets, what3words: w3w, mapPin: pin, accessNotes: notes,
        }))
        setSaved(true); setTimeout(() => setSaved(false), 2500)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
        <div className="space-y-6">
          <div>
            <p className="text-[15px] font-semibold">Which door?</p>
            <div className="mt-2.5 flex gap-2">
              {DOORS.map((d) => (
                <button key={d.key} type="button"
                        onClick={() => setDoor(door === d.key ? null : d.key)}
                        aria-pressed={door === d.key}
                        className="r-inner min-h-[48px] flex-1 text-[16px] font-semibold transition-colors"
                        style={door === d.key
                          ? { background: 'var(--tint)', color: '#fff' }
                          : { background: 'rgb(var(--glass-line) / 0.08)' }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => setPets((p) => !p)}
                  className="flex min-h-[52px] w-full items-center gap-3 text-left">
            <span className="grid h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors"
                  style={{ background: pets ? 'var(--stage-done)' : 'rgb(var(--glass-line) / 0.22)' }}>
              <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                pets ? 'translate-x-5' : 'translate-x-0'}`} />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold">There is a dog</span>
              <span className="block text-[14px] muted">So they knock rather than walk in</span>
            </span>
          </button>

          <label className="block">
            <span className="text-[15px] font-semibold">what3words</span>
            <span className="mt-0.5 block text-[14px] muted">
              For a track or a field gate with no number
            </span>
            <input type="text" value={w3w} onChange={(e) => setW3w(e.target.value)}
                   placeholder="///filled.count.soap" autoCapitalize="none" autoCorrect="off"
                   className="field mt-2" />
            {normaliseW3w(w3w) ? (
              <a href={w3wUrl(normaliseW3w(w3w))} target="_blank" rel="noreferrer"
                 className="mt-2 inline-flex min-h-[40px] items-center text-[15px] font-medium" style={{ color: 'var(--tint)' }}>
                Check it opens on the right square ›
              </a>
            ) : (
              /* The box used to assume you already knew your three words,
                 which is the one assumption that fails for the person it is
                 for: somebody at a gate with no number. */
              <FindWords onWords={setW3w} />
            )}
          </label>

          <div className="block">
            <span className="text-[15px] font-semibold">Or drop a pin</span>
            <span className="mt-0.5 block text-[14px] muted">
              Easiest from your doorstep — one tap and your phone does it.
            </span>

            {/* The one-tap way, first, because it is the one that works for
                somebody standing at their own door. */}
            <div className="mt-2.5">
              <DropPin onPin={(url) => setPin(url)} label="Use where I am now" />
            </div>

            <span className="mt-4 block text-[14px] muted">
              Or in Google Maps: press and hold on your door, Share, paste the link here
            </span>
            <input type="url" value={pin} onChange={(e) => setPin(e.target.value)}
                   placeholder="https://maps.app.goo.gl/…" autoCapitalize="none" autoCorrect="off" inputMode="url"
                   className="field mt-2" />
            {pin && !normaliseMapPin(pin) && (
              <span className="mt-2 block text-[14px]" style={{ color: 'var(--stage-paused)' }}>
                That is not a Google Maps link — it needs to start https://maps.app.goo.gl or https://www.google.com/maps
              </span>
            )}
            {normaliseMapPin(pin) && (
              <a href={normaliseMapPin(pin)} target="_blank" rel="noreferrer"
                 className="mt-2 inline-flex min-h-[40px] items-center text-[15px] font-medium" style={{ color: 'var(--tint)' }}>
                Check the pin ›
              </a>
            )}
          </div>

          <label className="block">
            <span className="text-[15px] font-semibold">Anything else?</span>
            <span className="mt-0.5 block text-[14px] muted">
              Parking, the gate, a sleeping baby — whatever saves them a phone call
            </span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={400}
                      placeholder="Park on the verge past the postbox. Gate sticks — lift it."
                      className="field mt-2" />
            <span className="mt-1 block text-right text-[12px] muted">{notes.length}/400</span>
          </label>

          <p className="r-inner px-4 py-3 text-[14px]"
             style={{ background: 'color-mix(in srgb, var(--stage-paused) 13%, transparent)' }}>
            Please do not put a key safe code here. This page opens from a link in a
            text message — tell them the code on the phone instead.
          </p>

          <button type="button" onClick={save} disabled={saving}
                  className="btn btn-filled w-full">
            {saving ? 'Sending…' : 'Send this to them'}
          </button>
        </div>
  )
}
