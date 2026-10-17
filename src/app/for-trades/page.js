import Link from 'next/link'
import SiteShell from '@/components/SiteShell'
import Shot from '@/components/Shot'
import { ChevronIcon, TickIcon } from '@/components/icons'

/**
 * One job, start to finish, from the trade's side.
 *
 * The homepage shows every part of the product at once, which is the right
 * thing for somebody deciding whether it is real and the wrong thing for a
 * plumber asking "what would my Tuesday look like". This page answers that,
 * in the order a job happens, each moment as the part of the screen that does
 * it (the same crops as the homepage, so it cannot show an old screen). A
 * picture, not a paragraph.
 */
export const metadata = {
  title: 'For trades | TurnUp',
  description: 'One link per job. Your customer sees the stage, and you stop answering “when are you coming?”.',
  robots: { index: true, follow: true },
}

/* [who, crop, label, line]. `who` is whose screen the crop is. */
const DAY = [
  ['you',  'trade-fields',        'Book it',                 'Five fields, or straight from ServiceM8.'],
  ['you',  'trade-send',          'Send the link',           'Text, WhatsApp, or ServiceM8 does it.'],
  ['them', 'row-presence',        'The afternoon before',    'They are asked once: will someone be in?'],
  ['you',  'trade-stage-buttons', 'Set off',                 'One tap, next to the van.'],
  ['them', 'row-notify',          'Their phone buzzes',      'Your name, your face, your van.'],
  ['you',  'trade-navigate-note', 'Find the door',           'Their note, their pin. Only you see it.'],
  ['them', 'stage-paused',        'Paused, and why',         'Waiting on a part? Say it once.'],
  ['them', 'row-after',           'Job done',                'A review, or a private word. Both open.'],
]

const GAINS = [
  ['Fewer “when are you coming?” calls', 'The stage answers it.'],
  ['Fewer wasted trips', 'They said who is in, the day before.'],
  ['Terms agreed before the day', 'One tap, with the time on it.'],
  ['More reviews', 'Asked two hours after, not never.'],
]

export default function ForTrades() {
  return (
    <SiteShell id="trades">
      <section className="mt-12">
        <p className="text-[15px] font-semibold" style={{ color: 'var(--tint)' }}>For trades</p>
        <h1 className="mt-1 text-[40px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
          Stop the “when are you coming?” calls.
        </h1>
        <p className="mt-5 text-[19px] leading-snug muted">One link per job. They see the stage. You tap one button.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/join?as=trade" className="btn btn-filled !px-6">Get on the list</Link>
          <Link href="/demo" className="btn btn-grey !px-6">See what they see <ChevronIcon size={16} /></Link>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">One job, start to finish</h2>
        <p className="mt-2 text-[17px] leading-snug muted">What you tap, and what they see.</p>
        <ol className="mt-6">
          {DAY.map(([who, crop, label, line], i) => (
            <li key={crop} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-x-4 pb-9 last:pb-0">
              {/* the rail: the same dots-and-line the status card draws */}
              {i < DAY.length - 1 && (
                <span aria-hidden="true" className="absolute left-[13px] top-7 bottom-0 w-[2px]"
                      style={{ background: 'color-mix(in srgb, var(--tint) 30%, transparent)' }} />
              )}
              <span className="relative z-10 grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold text-white"
                    style={{ background: 'var(--tint)' }}>{i + 1}</span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--label-3)' }}>
                  {who === 'you' ? 'You' : 'Them'}
                </p>
                <p className="text-[19px] font-semibold leading-tight">{label}</p>
                <p className="mt-0.5 text-[15px] leading-snug muted">{line}</p>
                <Shot name={crop} label="" alt={`${label}: ${line}`} className="mt-3 max-w-[360px]" fade={crop === 'trade-fields'} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">What it saves</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {GAINS.map(([head, sub]) => (
            <li key={head} className="glass r-outer flex items-start gap-3 p-4">
              <span className="mt-0.5 shrink-0" style={{ color: 'var(--tint)' }}><TickIcon size={20} /></span>
              <span className="min-w-0">
                <span className="block text-[17px] font-semibold leading-tight">{head}</span>
                <span className="mt-1 block text-[15px] leading-snug muted">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/with-servicem8" className="glass r-outer mt-10 flex items-center justify-between gap-3 px-4 py-4">
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold leading-tight">Already on ServiceM8?</span>
          <span className="mt-0.5 block text-[15px] leading-snug muted">One line in your booking text.</span>
        </span>
        <span className="shrink-0" style={{ color: 'var(--tint)' }}><ChevronIcon size={18} /></span>
      </Link>

      <section className="glass r-outer mt-10 p-6 text-center">
        <p className="text-[21px] font-semibold">Want it for your jobs?</p>
        <p className="mt-1.5 text-[16px] leading-snug muted">It runs for one plumbing firm while it is made properly. Watch your card build as you sign up.</p>
        <Link href="/join?as=trade" className="btn btn-filled mt-5 w-full sm:w-auto sm:!px-8">Get on the list</Link>
      </section>
    </SiteShell>
  )
}
