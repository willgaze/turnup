'use client'
import { VanIcon, ChevronIcon } from '@/components/icons'
import Shot from '@/components/Shot'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Set up once, shown on every job from then on.
 *
 * The registration does the work: the MOT history API returns make, model and
 * colour, so the trade types a plate rather than describing their van. (DVLA
 * is the fallback; it has no model.) Without a key it falls
 * back to typing make and colour, which takes ten seconds once.
 */
export default function Profile() {
  const [open, setOpen] = useState(false)
  const [p, setP] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [looking, setLooking] = useState(false)
  const [lookupNote, setLookupNote] = useState(null)
  const [needsKey, setNeedsKey] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/dashboard/profile')
    if (r.ok) setP((await r.json()).profile || {})
  }, [])
  useEffect(() => { load() }, [load])

  const set = (k) => (e) => setP((x) => ({ ...x, [k]: e.target.value }))

  const lookup = async () => {
    if (!p.vehicleReg) return
    setLooking(true); setLookupNote(null); setNeedsKey(false)
    try {
      const r = await fetch('/api/dashboard/vehicle-lookup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg: p.vehicleReg }),
      })
      const v = await r.json()
      if (v.make || v.colour || v.model) {
        setP((x) => ({
          ...x,
          vehicleMake: v.make || x.vehicleMake,
          vehicleModel: v.model || x.vehicleModel,
          vehicleColour: v.colour || x.vehicleColour,
        }))
        const found = [v.colour, v.make, v.model].filter(Boolean).join(' ')
        setLookupNote(v.model ? `Found it — ${found}.` : `Found it — ${found}. Add the model yourself; DVLA does not hold it.`)
      } else if (v.error === 'not_configured') {
        setNeedsKey(true)
      } else if (v.error === 'not_found') {
        setLookupNote('No record for that plate. Type the make, model and colour below.')
      } else {
        setLookupNote('Lookup did not work. Type the make, model and colour below.')
      }
    } finally { setLooking(false) }
  }

  // The photo: shrunk on the phone to a square-ish 512px JPEG, posted as
  // bytes, served from /api/profile/photo. No URL to find and paste.
  const photoRef = useRef(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoNote, setPhotoNote] = useState(null)
  const photoUrl = p.engineerPhotoAt ? `/api/profile/photo?v=${new Date(p.engineerPhotoAt).getTime()}` : (p.engineerPhoto || null)
  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setPhotoBusy(true); setPhotoNote(null)
    try {
      const bmp = await createImageBitmap(f)
      const side = Math.min(bmp.width, bmp.height), out = Math.min(512, side)
      const c = document.createElement('canvas'); c.width = out; c.height = out
      c.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out)
      let q = 0.82, data = c.toDataURL('image/jpeg', q)
      while (data.length > 400_000 && q > 0.4) { q -= 0.1; data = c.toDataURL('image/jpeg', q) }
      const r = await fetch('/api/dashboard/profile/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo: data }) })
      if (!r.ok) { setPhotoNote('That did not save. Try a different photo.'); return }
      await load(); setPhotoNote('Saved. Every customer sees it from the moment you set off.')
    } catch { setPhotoNote('Could not read that photo. Try another.') } finally { setPhotoBusy(false) }
  }
  const removePhoto = async () => {
    setPhotoBusy(true)
    try { await fetch('/api/dashboard/profile/photo', { method: 'DELETE' }); await load(); setPhotoNote('Removed.') } finally { setPhotoBusy(false) }
  }

  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      const r = await fetch('/api/dashboard/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p),
      })
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); setOpen(false) }
    } finally { setSaving(false) }
  }

  const ready = p.engineerName || p.vehicleReg

  return (
    <section className="glass r-outer mt-8">
      <button type="button" onClick={() => setOpen((o) => !o)}
              className="flex min-h-[64px] w-full items-center gap-4 px-6 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center r-inner"
              style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 13%, transparent)' }}>
          <VanIcon size={21} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">Who to expect</span>
          <span className="block text-[14px] muted">
            {ready
              ? [p.engineerName, [p.vehicleColour, p.vehicleMake].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
              : 'Your name and van — set up once'}
          </span>
        </span>
        <ChevronIcon size={18} style={{ color: 'var(--label-3)' }}
                     className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {saved && !open && <p className="px-6 pb-5 text-[14px] text-stage-done">Saved.</p>}

      {open && (
        <div className="space-y-5 border-t hairline px-6 py-6">
          {/* The row this fills in, as the customer opens it. Shown from On my way. */}
          <Shot name="row-who" label="What they open once you set off" note="Shown from On my way, not before." fade className="max-w-[360px]" />

          <Field label="Your name" hint="A first name is plenty"
                 value={p.engineerName || ''} onChange={set('engineerName')} placeholder="Will" />
          <Field label="One line about you" hint="Optional"
                 value={p.aboutLine || ''} onChange={set('aboutLine')}
                 placeholder="G3 qualified, 22 years on the tools" />

          <div>
            <label className="block text-[15px] font-semibold">Van registration</label>
            <p className="mt-0.5 text-[14px] muted">We look up the make and colour for you</p>
            <div className="mt-2 flex gap-2">
              <input value={p.vehicleReg || ''} onChange={set('vehicleReg')}
                     placeholder="AB12 CDE" autoCapitalize="characters" autoCorrect="off"
                     className="r-inner min-h-[50px] flex-1 bg-[#f5d32a] px-4 text-center font-mono text-[18px] font-bold tracking-wider text-black placeholder:text-black/35" />
              <button type="button" onClick={lookup} disabled={looking || !p.vehicleReg}
                      className="btn accent-fill !min-h-[50px] shrink-0 !px-4 !text-[15px]">
                {looking ? '…' : 'Look up'}
              </button>
            </div>
            {lookupNote && <p className="mt-2 text-[14px] muted">{lookupNote}</p>}
            {needsKey && (
              <div className="r-inner mt-3 px-4 py-3.5 text-[14px]"
                   style={{ background: 'color-mix(in srgb, var(--stage-paused) 13%, transparent)' }}>
                <p className="font-semibold">The lookup is built but has no key yet.</p>
                <p className="mt-1">
                  The DVSA MOT history API gives make, model and colour for free. Register with
                  your name, email and postal address; the key takes up to five working days.
                </p>
                <a href="https://documentation.history.mot.api.gov.uk/mot-history-api/register"
                   target="_blank" rel="noreferrer"
                   className="btn btn-tinted mt-2.5 !min-h-[42px] !px-4 !text-[14px]">
                  Register for the MOT history API ›
                </a>
                <p className="mt-2.5 muted">
                  When the email arrives, add <code className="font-mono">MOT_CLIENT_ID</code>,{' '}
                  <code className="font-mono">MOT_CLIENT_SECRET</code> and{' '}
                  <code className="font-mono">MOT_API_KEY</code> in Vercel and redeploy. Use the key
                  within 90 days or DVSA restrict it. Until then, type the details below — it is ten
                  seconds, once.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Colour" value={p.vehicleColour || ''} onChange={set('vehicleColour')} placeholder="White" />
            <Field label="Make" value={p.vehicleMake || ''} onChange={set('vehicleMake')} placeholder="Ford" />
          </div>
          <Field label="Model" hint="Filled by the lookup, or type it" value={p.vehicleModel || ''}
                 onChange={set('vehicleModel')} placeholder="Transit Custom" />

          <div>
            <span className="block text-[15px] font-semibold">Photo of you</span>
            <span className="mt-0.5 block text-[14px] muted">The face at the door. Shown on their page the moment you set off, and in the On my way notification where the phone allows it.</span>
            <div className="mt-2 flex items-center gap-3">
              {photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={photoUrl} alt="You" className="h-16 w-16 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-[22px] font-bold" style={{ color: 'var(--tint)', background: 'color-mix(in srgb, var(--tint) 13%, transparent)' }}>{(p.engineerName || '?').trim()[0]?.toUpperCase()}</span>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => photoRef.current?.click()} disabled={photoBusy} className="btn btn-tinted !min-h-[44px] !px-4 !text-[14px]">{photoBusy ? 'Saving…' : photoUrl ? 'Change photo' : 'Take or choose a photo'}</button>
                {photoUrl && <button type="button" onClick={removePhoto} disabled={photoBusy} className="btn btn-grey !min-h-[44px] !px-4 !text-[14px]">Remove</button>}
              </div>
              <input ref={photoRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
            </div>
            {photoNote && <p className="mt-2 text-[14px] muted">{photoNote}</p>}
          </div>
          <Field label="Photo of the van" hint="Sign-written is best — they spot it from the window"
                 value={p.vehiclePhoto || ''} onChange={set('vehiclePhoto')} placeholder="https://…" />
          <Field label="Your logo" hint="Shown at the top of the customer's page instead of your name in plain text"
                 value={p.brandLogo || ''} onChange={set('brandLogo')} placeholder="https://…" />
          {p.brandLogo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={p.brandLogo} alt="Your logo" className="h-10 w-auto max-w-[220px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          )}

          {/* What the link switches on: the row every customer sees after Job done. */}
          <Shot name="row-after" label="After Job done, every customer sees this" note="Both doors, to everyone. Nobody is sorted into happy and unhappy first." fade className="max-w-[360px]" />
          <Field label="Your Google review link" hint="Google Business Profile → Ask for reviews → copy the link. Google links only."
                 value={p.reviewUrl || ''} onChange={set('reviewUrl')} placeholder="https://g.page/r/…/review" />

          <button type="button" onClick={save} disabled={saving}
                  className="btn accent-fill w-full">
            {saving ? 'Saving…' : 'Save — every job from now on'}
          </button>
        </div>
      )}
    </section>
  )
}

function Field({ label, hint, ...rest }) {
  return (
    <label className="block">
      <span className="text-[15px] font-semibold">{label}</span>
      {hint && <span className="mt-0.5 block text-[14px] muted">{hint}</span>}
      <input {...rest} type="text"
             className="field mt-2" />
    </label>
  )
}
