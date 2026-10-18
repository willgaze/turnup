/**
 * No React hook after an early return.
 *
 *   node scripts/check-hook-order.mjs
 *
 * React needs the same hooks, in the same order, on every render. A hook
 * written below `if (...) return null` is called on some renders and not
 * others, and the render where the count changes throws (React error #310).
 * Until v1.66.0 "Are you still coming?" (src/app/t/StillComing.jsx) did
 * exactly that: a customer watching a Booked-in card saw "Application error"
 * at the moment the window started, which is the one moment that card exists
 * for. The repo has no ESLint config, so the react-hooks rule that would have
 * caught it never ran. This is that rule's one check, for every component.
 *
 * Crude on purpose: it reads each component's top-level lines (two-space
 * indent) and flags a `const ... = useX(` that follows a top-level return.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n)
  return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|tsx?)$/.test(n) ? [p] : []
})

/** The offending lines in one source text. */
function hooksAfterReturn(src) {
  const found = []
  const head = /\n(?:export default )?function ([A-Z]\w*)\s*\([^)]*\)\s*\{/g
  let m
  while ((m = head.exec(src))) {
    let depth = 1
    let i = m.index + m[0].length
    const start = i
    while (i < src.length && depth) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++ }
    let returned = false
    for (const line of src.slice(start, i).split('\n')) {
      if (/^ {2}(if \(.*\) )?return\b/.test(line) && !/^ {2}return \(/.test(line)) returned = true
      if (returned && /^ {2}(const|let) .*\buse[A-Z]\w*\(/.test(line)) found.push(`${m[1]}: ${line.trim().slice(0, 90)}`)
    }
  }
  return found
}

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }

// The checker still sees the bug it was written for.
const bad = "\nexport default function A({ s }) {\n  const [a] = useState(0)\n  if (!s) return null\n  const [b] = useState(1)\n  return (<p>{a}{b}</p>)\n}\n"
const good = "\nexport default function A({ s }) {\n  const [a] = useState(0)\n  const [b] = useState(1)\n  if (!s) return null\n  return (<p>{a}{b}</p>)\n}\n"
check(hooksAfterReturn(bad).length === 1, 'self-test: a hook after `return null` is caught')
check(hooksAfterReturn(good).length === 0, 'self-test: hooks above the return pass')

const offenders = walk('src').flatMap((f) => hooksAfterReturn(readFileSync(f, 'utf8')).map((x) => `${f}  ${x}`))
for (const o of offenders) console.log(`  FAIL ${o}`)
check(offenders.length === 0, `no hook after an early return in src/ (${offenders.length} found)`)

console.log(`\n${failed === 0 ? 'Every hook runs on every render.' : `${failed} check(s) failed.`}`)
process.exit(failed === 0 ? 0 : 1)
