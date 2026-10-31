import Image from 'next/image'

/**
 * A phone, drawn properly: bezel, island, screen corners, and optionally tilted
 * in 3D the way App Store artwork tilts a device so it stops being a rectangle.
 *
 * `screen` is one of the real captures in public/home/ (780 wide, 2×). The
 * frame is sized by width; the screen keeps the capture's own aspect and is
 * clipped at the bottom so it can run off the edge of a poster.
 */
/* `media` is a node drawn where the still would be (the homepage's film of the
   card, src/components/HomeVideo.jsx); it fills the screen and is clipped by
   the frame like the still is. */
export default function Device({ screen, alt, width = 300, height, tilt = false, className = '', priority = false, media = null, children }) {
  const h = height || Math.round(width * 2.05)
  return (
    <div className={`relative shrink-0 ${className}`}
         style={{ width, height: h,
                  /* `tilt` is true for the house angle, or a number of degrees
                     to turn it about the vertical, so three phones in a row can
                     fan rather than all lean the same way */
                  transform: tilt ? `perspective(1800px) rotateY(${typeof tilt === 'number' ? tilt : -11}deg) rotateX(5deg) rotateZ(${typeof tilt === 'number' && tilt > 0 ? 1 : -1}deg)` : undefined,
                  filter: 'drop-shadow(0 34px 44px rgba(0,0,0,.45)) drop-shadow(0 8px 12px rgba(0,0,0,.25))' }}>
      <div className="absolute inset-0 rounded-[13%/6.4%] bg-[#0c0c0e] ring-1 ring-white/10"
           style={{ boxShadow: 'inset 0 0 0 2px #2a2a2e, inset 0 0 0 5px #0c0c0e' }} />
      <div className="absolute inset-[2.8%] overflow-hidden rounded-[11%/5.4%] bg-[#111]">
        {media ? (
          <div className="absolute inset-0 bg-[#eef0f3]">{media}</div>
        ) : children ? (
          <div className="absolute inset-0 overflow-hidden bg-[#eef0f3]" aria-label={alt}>
            {/* a 390-wide phone screen, drawn at natural size and scaled to fit the frame */}
            <div className="origin-top-left" style={{ width: 390, height: Math.round(390 * h / width / 0.944), transform: `scale(${width * 0.944 / 390})` }}>{children}</div>
          </div>
        ) : (
          <Image src={screen} alt={alt} width={780} height={1560} priority={priority}
                 sizes={`${width}px`} className="block h-auto w-full" />
        )}
        {/* status bar on a frosted strip, the way iOS keeps it legible over
            whatever has scrolled underneath */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[7.2%] bg-white/70 backdrop-blur-md"
             style={{ maskImage: 'linear-gradient(#000 70%, transparent)', WebkitMaskImage: 'linear-gradient(#000 70%, transparent)' }} />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 flex items-center justify-between px-[8%] pt-[3.4%] text-[#1d1d1f]"
             style={{ fontSize: width * 0.045, fontWeight: 600, letterSpacing: '-0.01em' }}>
          <span>9:41</span>
          <span className="flex items-center gap-[0.35em]">
            <span className="flex items-end gap-[1px]">{[0.4, 0.6, 0.8, 1].map((h, i) => (
              <span key={i} className="w-[0.22em] rounded-[1px] bg-current" style={{ height: `${h * 0.75}em` }} />))}</span>
            <span className="inline-block h-[0.5em] w-[1.25em] rounded-[0.18em] border-[0.09em] border-current p-[0.06em]"><span className="block h-full w-[85%] rounded-[0.08em] bg-current" /></span>
          </span>
        </div>
      </div>
      {/* dynamic island */}
      <div aria-hidden="true" className="absolute left-1/2 top-[4.2%] h-[3.2%] w-[27%] -translate-x-1/2 rounded-full bg-black" />
    </div>
  )
}
