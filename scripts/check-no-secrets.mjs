#!/usr/bin/env node
/**
 * No key ever ships. (Go-to-market stop 1, after the 21 Oct 2026 leak.)
 *
 * On 21 Oct 2026 `vercel --prod` run inside ~/TurnUp-Apple put pass.key,
 * key.password and turnup.env on www.getturnup.com for about three minutes.
 * The script that did it is fixed (v1.73.1, check-wallet-script.sh). This is
 * the second lock, and it looks at what would be SERVED rather than at what a
 * script meant to do:
 *
 *   node scripts/check-no-secrets.mjs            # the repo's tracked files
 *   node scripts/check-no-secrets.mjs .next      # a build's output, after next build
 *   node scripts/check-no-secrets.mjs --self-test
 *
 * It fails, naming the file, on:
 *   - a key-shaped PATH: anything under an apple/ folder, *.key, *.p12, *.pfx,
 *     *.cer, *.csr, *.pem, turnup.env, key.password, a .env file (the repo's
 *     .env.example is the one allowed, and its values must be empty or
 *     placeholders)
 *   - a key-shaped CONTENT: a PEM private-key block with a real body, an
 *     Anthropic, GitHub, AWS or Stripe live key, or a Postgres URL with a
 *     password that is not a placeholder
 *
 * Two lines in the repo carry the words of a key on purpose (a fixture with
 * the body "abc", and a grep in apple-wallet.sh). A private-key block counts
 * only when its body is long enough to be a key, so those pass without an
 * allow-list that could one day wave a real one through.
 *
 * It is run by `npm run build` against .next (so Vercel refuses to deploy a
 * build that carries one) and by .github/workflows/checks.yml on every push.
 * It never prints a secret: only the file, the line and which rule it broke.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, basename, extname } from 'node:path'
import { execFileSync } from 'node:child_process'

const BAD_EXT = new Set(['.key', '.p12', '.pfx', '.cer', '.csr', '.pem'])
const BAD_NAME = new Set(['turnup.env', 'key.password', 'pass.key'])

export function badPath(p) {
  const parts = p.split(/[\\/]/)
  const name = basename(p)
  if (parts.slice(0, -1).includes('apple')) return 'inside an apple/ folder'
  if (BAD_NAME.has(name)) return `a key file (${name})`
  if (BAD_EXT.has(extname(name).toLowerCase())) return `a key-shaped file (${extname(name)})`
  if (/^\.env(\.|$)/.test(name) && name !== '.env.example') return 'an environment file'
  return null
}

const PEM = /-----BEGIN ([A-Z ]*)PRIVATE KEY-----([\s\S]*?)-----END \1PRIVATE KEY-----/g
const TOKENS = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/, 'an Anthropic API key'],
  [/\bghp_[A-Za-z0-9]{30,}/, 'a GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{30,}/, 'a GitHub token'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'an AWS key'],
  [/\bsk_live_[A-Za-z0-9]{20,}/, 'a Stripe live key'],
]
const PLACEHOLDER = /^(user|pass|password|\*+|x+|changeme|change-me|secret|postgres|<[^>]*>|\$\{?[A-Z_]+\}?)$/i

export function badContent(text) {
  for (const m of text.matchAll(PEM)) {
    const body = m[2].replace(/^(Proc-Type|DEK-Info):.*$/gm, '').replace(/\s+/g, '')
    if (body.length >= 64) return 'a private key'
  }
  for (const [re, what] of TOKENS) if (re.test(text)) return what
  for (const m of text.matchAll(/postgres(?:ql)?:\/\/([^:\/\s'"@]+):([^@\s'"]+)@([^\/\s'"]+)/g)) {
    const [, , pw, host] = m
    if (PLACEHOLDER.test(pw)) continue
    if (/^(localhost|127\.0\.0\.1|host|db|postgres)(:\d+)?$/.test(host)) continue
    return 'a database URL with a password'
  }
  return null
}

const TEXT_EXT = /\.(m?js|jsx|cjs|json|html?|txt|md|css|map|rsc|env|ya?ml|sh|example|webmanifest|xml|svg)$/i
const MAX_BYTES = 8 * 1024 * 1024

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'cache') continue
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function tracked() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
}

function scan(files, root) {
  const problems = []
  for (const f of files) {
    const rel = root ? relative(root, f) : f
    const why = badPath(rel)
    if (why) { problems.push(`${rel}: ${why}`); continue }
    if (!TEXT_EXT.test(f) && !/^\.env/.test(basename(f))) continue
    let s
    try { s = statSync(f) } catch { continue }
    if (!s.isFile() || s.size > MAX_BYTES) continue
    const text = readFileSync(f, 'utf8')
    const what = badContent(text)
    if (what) {
      const line = text.split('\n').findIndex((l) => badContent(l) || /PRIVATE KEY-----/.test(l)) + 1
      problems.push(`${rel}${line > 0 ? `:${line}` : ''}: ${what}`)
    }
  }
  return problems
}

function selfTest() {
  const body = 'MIIEowIBAAKCAQEA' + 'Q'.repeat(80)
  const cases = [
    [badPath('apple/pass.key'), true], [badPath('x/apple/turnup.env'), true],
    [badPath('static/key.password'), true], [badPath('public/cert.pem'), true],
    [badPath('.env.local'), true], [badPath('.env'), true],
    [badPath('.env.example'), false], [badPath('src/lib/passkit.js'), false],
    [badPath('public/apple-touch-icon.png'), false], [badPath('docs/apple-wallet.md'), false],
    [badContent(`-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-256-CBC,00\n\n${body}\n-----END RSA PRIVATE KEY-----`), true],
    [badContent('-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----'), false],
    [badContent("grep -q 'BEGIN RSA PRIVATE KEY' \"$KEY\""), false],
    [badContent('sk-ant-api03-' + 'a'.repeat(40)), true],
    [badContent('postgresql://user:pass@host/db'), false],
    [badContent('postgresql://neondb_owner:npg_Zx81kQ@ep-cool-1.eu-west-2.aws.neon.tech/neondb'), true],
    [badContent('postgresql://postgres:postgres@localhost:5432/turnup'), false],
  ]
  const failed = cases.map(([got, want], i) => (Boolean(got) === want ? null : i)).filter((i) => i !== null)
  if (failed.length) { console.error(`check-no-secrets self-test FAILED: cases ${failed.join(', ')}`); process.exit(1) }
  console.log(`check-no-secrets self-test: ${cases.length} cases OK`)
}

const arg = process.argv[2]
if (arg === '--self-test') { selfTest(); process.exit(0) }
selfTest()
let problems
if (arg) {
  if (!existsSync(arg)) { console.error(`check-no-secrets: ${arg} does not exist (run the build first)`); process.exit(1) }
  problems = scan(walk(arg), arg)
  console.log(`check-no-secrets: scanned ${arg}`)
} else {
  problems = scan(tracked())
  console.log('check-no-secrets: scanned tracked files')
}
if (problems.length) {
  console.error(`\nFAIL — ${problems.length} thing(s) that must never ship:\n  ${problems.join('\n  ')}\n`)
  console.error('Nothing was printed but the file and the rule. Remove the file, rotate whatever it held, then run again.')
  process.exit(1)
}
console.log('check-no-secrets: clean')
