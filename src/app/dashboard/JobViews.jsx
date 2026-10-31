'use client'

import { StageIcon } from '@/components/icons'
import { stageOf } from '@/lib/trade-status'
import { rowWhen } from '@/lib/views'

/**
 * The views bar: one chip per view, each with its count. The ServiceM8 idea
 * (Action required, Today, ...) on a phone: the same jobs cut different ways,
 * and only one cut on screen at a time. A view with nothing in it stays on the
 * bar, greyed, so the bar never jumps about as the day goes.
 *
 * Colour: red only for "someone is waiting on you now" (an unanswered ask, a
 * missed window). Everything else that needs you is amber. Calm views carry
 * the accent. Red is for real problems.
 */
export function ViewBar({ built, view, onPick }) {
  const alerts = built.byKey.needs.rows.filter((t) => built.reasons(t)[0]?.alert).length
  return (
    <nav aria-label="Views" className="-mx-4 mt-5 overflow-x-auto px-4 [scrollbar-width:none]">
      <div className="flex w-max gap-2 pb-1">
        {built.views.filter((v) => v.key !== 'loose' || v.count > 0).map((v) => {
          const on = v.key === view
          const hot = v.key === 'needs' && v.count > 0
          const colour = hot ? (alerts ? '#ff3b30' : '#ff9500') : 'var(--tint)'
          return (
            <button key={v.key} type="button" onClick={() => onPick(v.key)} aria-pressed={on}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors"
                    style={on
                      ? { background: colour, color: '#fff' }
                      : { background: 'rgb(var(--glass-line) / 0.08)', color: v.count ? 'var(--label-1, inherit)' : 'var(--label-3)' }}>
              {v.label}
              <span className="min-w-[22px] rounded-full px-1.5 text-center text-[13px] tabular-nums"
                    style={on ? { background: 'rgb(255 255 255 / 0.25)' } : { background: hot ? colour : 'rgb(var(--glass-line) / 0.12)', color: hot ? '#fff' : 'inherit' }}>
                {v.count}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/**
 * One line per job: who, when, the stage, and the one reason it is here.
 * Tapping it opens the full card in place. This is what keeps fourteen jobs
 * to one screen; the stage buttons, hours and link live one tap away.
 */
export function JobRow({ t, reason, onOpen }) {
  const st = stageOf(t.stage)
  const colour = reason ? (reason.alert ? '#ff3b30' : '#ff9500') : 'var(--label-2)'
  return (
    <li className={`tone-${st.tone}`}>
      <button type="button" onClick={onOpen}
              className={`glass r-outer flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left ${t.isActive === false ? 'opacity-55' : ''}`}
              style={reason ? { boxShadow: `inset 4px 0 0 ${colour}` } : undefined}>
        <StageIcon tone={st.tone} size={22} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[16px] font-semibold">{t.customerName || t.jobSummary || 'No name'}</span>
            <span className="shrink-0 text-[13px] tabular-nums muted">{rowWhen(t)}</span>
          </span>
          <span className="block truncate text-[14px]" style={{ color: colour, fontWeight: reason ? 600 : 400 }}>
            {reason ? reason.words : [st.label, t.jobSummary].filter(Boolean).join(' · ')}
          </span>
        </span>
      </button>
    </li>
  )
}
