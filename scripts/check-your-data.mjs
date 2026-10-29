/**
 * Your data: download and delete, checked without a database.
 *
 *   node scripts/check-your-data.mjs
 *
 * The typed-name guard, that no secret column can reach the download, that
 * both routes guard themselves and the delete checks the name on the server,
 * and that one job can only be erased once its link is off.
 */
import { readFileSync } from 'node:fs'
import { confirmMatches, exportFilename, DELETE_REMOVES, DELETE_KEEPS, EXPORT_LEAVES_OUT } from '../src/lib/your-data.js'

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// The guard.
const name = 'Sam Hale Plumbing'
check(confirmMatches('Sam Hale Plumbing', name), 'the exact name confirms')
check(confirmMatches('  sam  hale plumbing ', name), 'case and spacing do not matter')
check(!confirmMatches('Sam Hale', name), 'part of the name does not confirm')
check(!confirmMatches('Sam Hale Plumbing Ltd', name), 'more than the name does not confirm')
check(!confirmMatches('', name), 'empty does not confirm')
check(!confirmMatches(undefined, name), 'nothing sent does not confirm')
check(!confirmMatches(42, name), 'a number does not confirm')
check(!confirmMatches('', ''), 'an unset business name can never be confirmed by an empty box')
check(exportFilename(new Date('2026-10-26T08:00:00Z')) === 'turnup-export-2026-10-26.json', 'the file is named by date, not by business')

// Nothing secret in the download. These are the columns that hold a key, a
// token or a sealed secret; none may appear in the export's code.
const exp = code(src('src/lib/account-data.js'))
const exportPart = exp.slice(exp.indexOf('export async function exportAll'), exp.indexOf('export async function deleteAccount'))
for (const secret of ['cipher', 'inboxKey', 'p256dh', 'auth:', 'pushToken', 'publicKey', 'credentialId', 'token:', 'endpoint']) {
  check(!exportPart.includes(secret), `the download never selects ${secret.replace(':', '')}`)
}
for (const model of ['sm8OAuth', 'sm8App', 'googleApp', 'googleWalletApp', 'gmailLink', 'inboundSecret']) {
  check(!exportPart.includes(`prisma.${model}`), `the download never reads ${model}`)
}
check(/pushSubs: \{ select: \{ createdAt: true, lastSentAt: true \} \}/.test(exportPart), 'push subscriptions are counted, their keys never copied')
check(/passkey\.findMany\(\{ select: \{ label: true, createdAt: true, lastUsedAt: true \} \}\)/.test(exportPart), 'Face ID is listed by name and date, never by key')
check(/tradeDevice\.findMany\(\{ select: \{ label: true, createdAt: true, lastSentAt: true \} \}\)/.test(exportPart), 'nudge phones are listed by name and date, never by key')
check(EXPORT_LEAVES_OUT.length >= 3, 'the panel says what the download leaves out')

// The delete.
const del = code(src('src/lib/account-data.js')).slice(exp.indexOf('export async function deleteAccount'))
check(/eraseJobs\(/.test(del), 'the delete erases jobs through the same eraser as retention')
check(del.indexOf('isActive: false') > -1 && del.indexOf('isActive: false') < del.indexOf('eraseJobs('), 'every link is switched off before any job is deleted')
check(!/passkey\.deleteMany/.test(del), 'the sign-in stays (DELETE_KEEPS says so)')
check(!/place\.deleteMany/.test(del), 'household cards stay: they are the households\'')
check(!/waitlist\.deleteMany/.test(del), 'the waiting list stays')
check(DELETE_KEEPS.some((x) => /sign-in/i.test(x)) && DELETE_KEEPS.some((x) => /Household cards/.test(x)), 'the panel says what stays')
check(DELETE_REMOVES.some((x) => /Wallet/.test(x)) && DELETE_REMOVES.some((x) => /link/.test(x)), 'the panel says links and Wallet cards go')

// The routes guard themselves and the server checks the name.
const route = code(src('src/app/api/dashboard/data/route.js'))
const handlers = (route.match(/export async function (GET|POST|PUT|PATCH|DELETE)\(/g) || []).length
check(handlers === 2 && (route.match(/await requireOperator\(\)/g) || []).length === handlers, 'both /api/dashboard/data handlers guard themselves')
check(/confirmMatches\(body\?\.confirm, TRADE_NAME\)/.test(route) && route.indexOf('confirmMatches(') < route.indexOf('deleteAccount()'), 'the server checks the typed name before it deletes')
check(/attachment; filename=/.test(route), 'the download is served as a file')

// One job: two taps, link off first.
const tr = code(src('src/app/api/dashboard/trackers/[id]/route.js'))
check(/searchParams\.get\('erase'\) === '1'/.test(tr) && /switch_off_first/.test(tr), 'a job can only be erased once its link is off')
check(/eraseJobs\(\[id\]\)/.test(tr), 'erasing one job uses the shared eraser')

// The panel is wired and linkable.
const con = src('src/app/dashboard/Console.jsx')
check(/id="panel-data"/.test(con) && /<YourData \/>/.test(con), 'Your data is a panel under Setup and settings (/dashboard?open=data)')

if (failed) { console.log(`\n${failed} failed`); process.exit(1) }
console.log('\nyour data: all good')
