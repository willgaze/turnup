import Link from 'next/link'
import Preview from '../preview/Preview'

/**
 * A real customer page, with an invented job in it.
 *
 * The strongest thing the homepage can do is show the thing working rather
 * than describe it, and a screenshot is not that — a screenshot cannot be
 * tapped, and the rows on this page are the point.
 *
 * It is the same component the customer gets, from the same fixture the diary
 * is captured from. The banner is the difference, and it is not optional: a
 * page showing Sarah Whitfield's address with no mark on it is a page somebody
 * will think is somebody's real job.
 *
 * `robots: index false` — it is linked, not found. Its content is a worked
 * example of what a tracking link looks like, and a tracking link is exactly
 * what must never be in a search index, even a pretend one.
 */
export const metadata = {
  title: 'An example job | TurnUp',
  robots: { index: false, follow: false },
}

export default function DemoPage() {
  return (
    <>
      {/* Above the page rather than floating over it: anything overlapping the
          status card hides the one thing the visitor came to look at. */}
      <div className="relative z-20 px-4 pt-safe" data-demo-banner="">
        <div className="glass r-outer mx-auto mt-3 max-w-md p-4 text-center" style={{ '--tint': 'var(--mts-accent)' }}>
          <p className="text-[15px] font-semibold">This is an example</p>
          <p className="mt-1 text-[14px] leading-snug muted">
            A made-up job for a made-up plumber, so you can see what your customer gets. The names, the address and the times are all invented.
          </p>
          <Link href="/" className="mt-3 inline-flex min-h-[44px] items-center text-[15px] font-medium"
                style={{ color: 'var(--mts-accent)' }}>
            Back to TurnUp
          </Link>
        </div>
      </div>
      <Preview />
    </>
  )
}
