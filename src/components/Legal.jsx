import Link from 'next/link'
import Mark from '@/components/Mark'

/**
 * The frame the three paperwork pages share: /privacy, /processor and
 * /terms-for-trades. One look, so a trade reading all three before they sign
 * reads one document in three parts, not three templates.
 */
export const H2 = ({ children, id }) => (
  <h2 id={id} className="mt-11 scroll-mt-6 text-[24px] font-bold leading-tight tracking-[-0.02em]">{children}</h2>
)
export const P = ({ children, id }) => <p id={id} className="mt-3 scroll-mt-6 text-[16px] leading-relaxed">{children}</p>
export const Note = ({ children }) => <p className="mt-3 text-[14px] leading-relaxed muted">{children}</p>
export const A = ({ href, children }) => {
  if (/^mailto:/.test(href)) return <a href={href} style={{ color: 'var(--tint)' }}>{children}</a>
  const external = /^https?:/.test(href)
  return external
    ? <a href={href} target="_blank" rel="noreferrer noopener" style={{ color: 'var(--tint)' }}>{children}</a>
    : <Link href={href} style={{ color: 'var(--tint)' }}>{children}</Link>
}
export const List = ({ items }) => (
  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[16px] leading-relaxed">
    {items.map((x, i) => <li key={i}>{x}</li>)}
  </ul>
)

export function Table({ head, rows }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[15px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-b border-black/10 py-2 pr-4 text-left text-[13px] font-semibold uppercase tracking-[0.08em] muted dark:border-white/10">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, n) => (
            <tr key={n}>
              {r.map((c, i) => (
                <td key={i} className="border-b border-black/[.06] py-2.5 pr-4 align-top leading-snug dark:border-white/[.08]">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * One card per thing, labelled rows inside. For anything with more than three
 * columns: a four-column table on a 390px phone is a column of single words.
 */
export function Cards({ items }) {
  return (
    <div className="mt-4 space-y-3">
      {items.map((it, n) => (
        <div key={n} className="glass r-inner px-4 py-4">
          <p className="text-[17px] font-semibold leading-snug">{it.title}</p>
          {it.sub && <p className="mt-0.5 text-[13px] leading-snug muted">{it.sub}</p>}
          <dl className="mt-3 space-y-2.5">
            {it.rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] muted">{k}</dt>
                <dd className="mt-0.5 text-[15px] leading-snug">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}

/** The three pages, each linking the other two at the foot. */
const PAPERS = [
  ['/terms-for-trades', 'Trade terms'],
  ['/processor', 'Data processing terms'],
  ['/privacy', 'Privacy'],
]

export function LegalShell({ eyebrow, title, intro, updated, here, children }) {
  return (
    <div className="relative min-h-screen" style={{ '--tint': 'var(--mts-accent)' }}>
      <div className="stage-wash" aria-hidden="true" />
      <main className="relative z-10 mx-auto max-w-2xl px-5 pb-20 pt-safe">
        <header className="flex items-center justify-between pt-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="TurnUp home">
            <Mark className="h-8 w-auto" id="top" />
            <span className="text-[21px] font-bold tracking-[-0.02em]">TurnUp</span>
          </Link>
        </header>

        <section className="mt-10">
          <p className="text-[13px] font-semibold uppercase tracking-[0.13em] muted">{eyebrow}</p>
          <h1 className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">{title}</h1>
          {intro}
          <Note>Last updated {updated}. TurnUp is operated by its developer as a sole trader in the United Kingdom.</Note>
        </section>

        {children}

        <nav className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-black/10 pt-5 text-[15px] dark:border-white/10" aria-label="The paperwork">
          {PAPERS.map(([href, label]) => (
            href === here
              ? <span key={href} className="font-semibold">{label}</span>
              : <Link key={href} href={href} className="font-medium" style={{ color: 'var(--tint)' }}>{label}</Link>
          ))}
          <Link href="/" className="font-medium" style={{ color: 'var(--tint)' }}>← TurnUp</Link>
        </nav>
      </main>
    </div>
  )
}
