'use client'
import { ChevronIcon, TickIcon, WalletIcon } from '@/components/icons'

import { VERSION } from '@/lib/version'
import { BEFORE_AFTER, FLOW, MOATS, PLAN_META, PROBLEM_STATS, PRODUCT, RECENT_RELEASES, ROADMAP_COUNTS, STAGES, STATUS, WAITING_ON_OWNER, WALLET } from '@/lib/plan'
import { Eyebrow, Hero, Light, Section, Steps, Sub, Table, Tag } from './ui'

/* The first five sections: what it is, where it stands, the problem, the
   product, and the wallet card the product is pointing at. */

export function Cover() {
  return (
    <Section kicker="TurnUp" title={PLAN_META.strap}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((s, i) => (
          <div key={s.key} className={`glass r-inner p-4 tone-${s.key}`}>
            <Eyebrow tint>Stage {i + 1}</Eyebrow>
            <div className="text-[20px] font-bold">{s.label}</div>
            <div className="text-[14px] muted">{s.plain}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Hero value="1" label="link per job" />
        <Hero value="0" label="arrival times promised" />
        <Hero value="1" label="business using it" sub="customer zero" kind="fact" />
      </div>
      <div className="glass r-outer mt-4 flex items-center gap-4 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center r-inner accent-fill"><WalletIcon size={22} /></span>
        <div className="min-w-0">
          <div className="text-[17px] font-bold">{PLAN_META.premise}</div>
          <div className="text-[14px] muted">The link is what exists today. The card is what this plan is for.</div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <a href={PLAN_META.demoUrl} target="_blank" rel="noreferrer" className="btn btn-filled">Open the demo card</a>
        <a href={PLAN_META.repoUrl} target="_blank" rel="noreferrer" className="btn btn-grey">Code</a>
      </div>
    </Section>
  )
}

export function WhereWeAre({ readOnly }) {
  const greens = STATUS.filter((s) => s.state === 'green').length
  return (
    <Section kicker="Where we are" title={`Version ${VERSION}, live since ${PLAN_META.liveSince}`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Hero value={ROADMAP_COUNTS.live} label="features live" sub="counted from the roadmap" kind="fact" />
        <Hero value={ROADMAP_COUNTS.ready} label="built, waiting on a key" sub="Apple, DVSA, ServiceM8" kind="fact" />
        <Hero value={ROADMAP_COUNTS.idea} label="ideas, not built" sub="and said so" kind="fact" />
        <Hero value={RECENT_RELEASES} label="releases this week" sub="from the changelog, each with a diary" kind="fact" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[.08] dark:bg-white/[.1]">
          <div className="h-2 rounded-full bg-stage-done" style={{ width: `${(greens / STATUS.length) * 100}%` }} />
        </div>
        <span className="text-[13px] font-semibold tabular-nums muted">{greens} of {STATUS.length} green</span>
      </div>
      <div className="mt-4">
        <Table head={['Item', 'State', 'Note']}
               rows={STATUS.map((s) => [<b key="i">{s.item}</b>, <Light key="l" state={s.state} />, <span key="n" className="muted">{s.note}</span>])} />
      </div>
      {!readOnly && (
        <>
          <Sub>Taps only the owner can make, in order</Sub>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WAITING_ON_OWNER.map((w, i) => (
              <li key={w.label} className={`glass r-inner p-4 ${i === 0 ? 'tone-onway' : ''}`}>
                <Eyebrow tint>Tap {i + 1}</Eyebrow>
                <a href={w.href} target="_blank" rel="noreferrer" className="text-[17px] font-bold underline">{w.label}</a>
                <div className="mt-1 text-[13px] muted">{w.step}</div>
              </li>
            ))}
          </ol>
        </>
      )}
    </Section>
  )
}

export function Problem() {
  return (
    <Section kicker="The problem" title="Waiting in for a trade">
      <div className="grid gap-3 sm:grid-cols-3">
        {PROBLEM_STATS.slice(0, 3).map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="block"><Hero value={s.value} label={s.label} sub={s.source} kind={s.kind} /></a>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {PROBLEM_STATS.slice(3).map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="block"><Hero value={s.value} label={s.label} sub={s.source} kind={s.kind} /></a>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="glass r-inner p-5 tone-paused">
          <Eyebrow tint>Today</Eyebrow>
          <div className="mt-2"><Steps items={BEFORE_AFTER.before} tone="paused" /></div>
        </div>
        <div className="glass r-inner p-5 tone-done">
          <Eyebrow tint>With TurnUp</Eyebrow>
          <div className="mt-2"><Steps items={BEFORE_AFTER.after} tone="done" /></div>
        </div>
      </div>
      <p className="mt-3 text-[13px] muted">Small samples. Two surveys were paid for by trade businesses. Their figures, not ours.</p>
    </Section>
  )
}

/** A stage change travels in from the left and out to the right. */
function FlowDiagram() {
  const node = 'glass r-inner px-4 py-3 text-[14px] font-semibold'
  return (
    <div className="glass r-outer mt-4 p-5">
      <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
        <div className="grid gap-2">
          {FLOW.inputs.map((i) => <div key={i} className={node}>{i}</div>)}
        </div>
        <div className="flex items-center justify-center gap-2 md:flex-col">
          <ChevronIcon size={18} style={{ color: 'var(--label-3)' }} className="rotate-90 md:rotate-0" />
          <div className="rounded-full px-5 py-3 text-[16px] font-bold text-white accent-fill">{FLOW.core}</div>
          <ChevronIcon size={18} style={{ color: 'var(--label-3)' }} className="rotate-90 md:rotate-0" />
        </div>
        <div className="grid gap-2">
          {FLOW.outputs.map((o) => <div key={o} className={`${node} tone-done`} style={{ borderColor: 'color-mix(in srgb, var(--tint) 35%, transparent)' }}>{o}</div>)}
        </div>
      </div>
      <div className="mt-3 text-[12px] muted">{FLOW.inputs.length} ways in, {FLOW.outputs.length} ways out. The same row in the database feeds every one.</div>
    </div>
  )
}

export function Product() {
  return (
    <Section kicker="Product" title="What the card does, and will not">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-stage-done">Does</div>
          <div className="grid gap-2">
            {PRODUCT.does.map((d) => (
              <div key={d.label} className="glass r-inner flex items-center gap-3 px-4 py-3">
                <span className="text-stage-done"><TickIcon size={18} /></span>
                <span className="min-w-0"><span className="block font-semibold">{d.label}</span>{d.note && <span className="block text-[13px] muted">{d.note}</span>}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-stage-paused">Never</div>
          <div className="grid gap-2">
            {PRODUCT.never.map((d) => (
              <div key={d.label} className="glass r-inner px-4 py-3 font-semibold tone-paused" style={{ borderColor: 'color-mix(in srgb, var(--tint) 35%, transparent)' }}>{d.label}</div>
            ))}
          </div>
        </div>
      </div>
      <FlowDiagram />
    </Section>
  )
}

export function Wallet() {
  return (
    <Section kicker="The premise" title="A card in a wallet">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {WALLET.why.map((w, i) => (
          <div key={w} className="glass r-inner p-4">
            <Eyebrow>Why {i + 1}</Eyebrow>
            <div className="mt-1 text-[16px] font-bold">{w}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-stage-done">Built</div>
          <div className="grid gap-2">
            {WALLET.built.map((b) => (
              <div key={b.label} className="glass r-inner flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 text-stage-done"><TickIcon size={18} /></span>
                <span className="min-w-0"><span className="block font-semibold">{b.label}</span><span className="block text-[13px] muted">{b.note}</span></span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-stage-onway">Missing</div>
          <div className="grid gap-2">
            {WALLET.missing.map((m) => (
              <div key={m.label} className="glass r-inner flex items-start gap-3 px-4 py-3">
                <Light state={m.who === 'owner' ? 'amber' : 'gray'} />
                <span className="min-w-0">
                  <span className="block font-semibold">{m.label} <span className="text-[12px] font-semibold uppercase tracking-wide muted">{m.who === 'owner' ? 'owner' : 'to build'}</span></span>
                  <span className="block text-[13px] muted">{m.note}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[13px] muted">
        Until a pass is signed, this is a link, not a card, and the customer page says so.
        <a href={PLAN_META.walletDocUrl} target="_blank" rel="noreferrer" className="ml-1 underline">The Apple steps, written down</a>
      </p>
    </Section>
  )
}

/** The three moats: what a big firm cannot build in a sprint, and how much of each exists. */
export function Moats() {
  return (
    <Section kicker="The moats" title="Three things a big firm cannot build in a sprint">
      <div className="grid gap-3 lg:grid-cols-3">
        {MOATS.map((m) => (
          <div key={m.n} className="glass r-inner p-5">
            <Eyebrow>Moat {m.n}</Eyebrow>
            <div className="mt-1 text-[22px] font-bold leading-tight">{m.name}</div>
            <div className="mt-1 text-[14px] muted">{m.line}</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[.08] dark:bg-white/[.1]">
                <div className="h-2 rounded-full bg-stage-done" style={{ width: `${m.pct}%` }} />
              </div>
              <span className="text-[13px] font-semibold tabular-nums muted">{m.pct}%</span>
            </div>
            <div className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-stage-done">Today</div>
            <ul className="mt-1 grid gap-1 text-[14px]">
              {m.today.map((t) => <li key={t} className="flex gap-2"><span className="mt-0.5 shrink-0 text-stage-done"><TickIcon size={16} /></span>{t}</li>)}
            </ul>
            <div className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-stage-onway">Missing</div>
            <ul className="mt-1 grid gap-1 text-[14px]">
              {m.missing.map((t) => <li key={t} className="flex gap-2"><ChevronIcon size={14} style={{ color: 'var(--label-3)', marginTop: 4 }} />{t}</li>)}
            </ul>
            <div className="mt-3 rounded-full px-3 py-2 text-[12px] font-semibold text-white accent-fill">Gate: {m.gate}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[13px] muted"><Tag kind="estimate" /> The percentages are a working guess at how much of each moat exists. The lists under them are read from the roadmap.</div>
    </Section>
  )
}
