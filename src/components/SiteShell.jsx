import Link from 'next/link'
import Mark from '@/components/Mark'

/**
 * The frame round the public pages that explain the product (/for-trades,
 * /for-homes, /join): the mark, the two doors, and the footer. The homepage
 * keeps its own header because its hero sits right under it; these pages are
 * the ones a visitor reaches from it, so they always offer the way back and
 * the other door.
 */
export default function SiteShell({ children, id, wide = false }) {
  return (
    <div className="relative min-h-screen" style={{ '--tint': 'var(--mts-accent)' }}>
      <div className="stage-wash" aria-hidden="true" />
      <main className={`relative z-10 mx-auto px-5 pb-16 pt-safe ${wide ? 'max-w-2xl lg:max-w-5xl' : 'max-w-2xl'}`}>
        <header className="flex items-center justify-between gap-3 pt-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Mark className="h-8 w-auto" id={id} />
            <span className="text-[21px] font-bold tracking-[-0.02em]">TurnUp</span>
          </Link>
          <SiteNav />
        </header>
        {children}
        <SiteFooter id={`${id}-foot`} />
      </main>
    </div>
  )
}

export function SiteNav() {
  return (
    <nav className="flex items-center gap-4 text-[15px] font-medium" style={{ color: 'var(--tint)' }}>
      <Link href="/for-trades" className="inline-flex min-h-[44px] items-center">Trades</Link>
      <Link href="/for-homes" className="inline-flex min-h-[44px] items-center">Homes</Link>
    </nav>
  )
}

export function SiteFooter({ id }) {
  return (
    <footer className="mt-12 text-center">
      <Mark className="mx-auto h-6 w-auto opacity-60" id={id} />
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--label-3)' }}>
        TurnUp · <Link href="/for-trades" className="underline">For trades</Link> · <Link href="/for-homes" className="underline">For homes</Link> · <Link href="/with-servicem8" className="underline">With ServiceM8</Link> · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/terms-for-trades" className="underline">Trade terms</Link> · <Link href="/dashboard" className="underline">Sign in</Link>
      </p>
    </footer>
  )
}
