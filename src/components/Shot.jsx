import Image from 'next/image'
import crops from '@/lib/home-crops.json'

/**
 * A part of a screen, with a few words under it.
 *
 * Not a phone. The homepage used to explain each thing the app does with a
 * paragraph and a whole device beside it, and a whole device at 250px wide
 * makes the one row being talked about unreadable. This is that row, cut out
 * at 2x by scripts/capture-home-crops.mjs, shown large enough to read, under a
 * label of a few words. The picture does the explaining.
 *
 * `name` is a file in public/home/crops/; its pixel size comes from
 * src/lib/home-crops.json, which the capture script writes.
 */
export default function Shot({ name, label, note, alt, fade = false, className = '', priority = false }) {
  const size = crops[name]
  if (!size) return null
  return (
    <figure className={`min-w-0 ${className}`}>
      {/* a row cut short fades out rather than ending on a hard edge */}
      {/* flat, like the app it shows: the one corner radius, a hairline, no cast shadow */}
      <div className="overflow-hidden rounded-xl ring-1 ring-black/[.08] dark:ring-white/10"
           style={fade ? { maskImage: 'linear-gradient(#000 78%, transparent)', WebkitMaskImage: 'linear-gradient(#000 78%, transparent)' } : undefined}>
        <Image src={`/home/crops/${name}.webp`} alt={alt || label} width={size.w} height={size.h}
               priority={priority} sizes="(min-width: 640px) 320px, 90vw" className="block h-auto w-full" />
      </div>
      {label && (
        <figcaption className="mt-2.5 px-0.5">
          <span className="block text-[16px] font-semibold leading-tight">{label}</span>
          {note && <span className="mt-0.5 block text-[14px] leading-snug muted">{note}</span>}
        </figcaption>
      )}
    </figure>
  )
}

/* A row of shots you swipe on a phone and see three-across on a desktop. */
export function ShotStrip({ children }) {
  return (
    <div className="-mx-5 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  )
}
