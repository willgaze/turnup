/**
 * A re-export is not an import.
 *
 *   node scripts/check-reexports.mjs
 *
 * `export { pem } from './pass-auth.js'` forwards the binding to whoever
 * imports this file and creates **no local binding** in it. So a file that
 * re-exports a name and then calls that name itself throws
 * `ReferenceError: <name> is not defined` at runtime -- and never at build
 * time, because bundlers and `node --check` are both happy with it.
 *
 * That shipped on 25 Oct 2026. `passkit.js` re-exported `pem()` after it moved
 * to `pass-auth.js`, `buildSignedPass()` called `pem()` three lines later, and
 * every **Add to Apple Wallet** answered 503 for an hour. Every check passed
 * throughout, including the live one, because signing is the single path that
 * needs a real certificate and no check in this repo has one.
 *
 * So this is a cheap static guard for the exact shape: a name that is both
 * re-exported and called in the same file. The fix is always the same --
 * import it properly, then `export { name }` on its own.
 */
import { readFileSync } from 'node:fs'
import { glob } from 'node:fs/promises'

let failed = 0
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) failed += 1 }

// `export { a, b as c } from '...'` -- the form with a `from`, which is the
// one that creates no local binding. A bare `export { x }` is fine: x is local.
const RE_EXPORT = /export\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g

const files = []
for await (const f of glob('src/**/*.{js,jsx}')) files.push(f)
files.sort()

let found = 0
for (const file of files) {
  const src = readFileSync(file, 'utf8')
  // Comments out, so the note explaining the bug is not read as code.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const withoutReExports = code.replace(RE_EXPORT, '')

  // Names this file imports properly. `import { pem } from '...'` DOES make a
  // local binding, so importing and then re-exporting is the correct pattern
  // and must not be flagged -- nudge.js and pause.js both do it that way.
  const imported = new Set()
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g)) {
    for (const part of m[1].split(',')) {
      const local = part.trim().split(/\s+as\s+/).pop().trim()
      if (local) imported.add(local)
    }
  }

  for (const m of code.matchAll(RE_EXPORT)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim()
      if (!name || name === 'default' || !/^[A-Za-z_$][\w$]*$/.test(name)) continue
      found += 1
      if (imported.has(name)) continue          // has a real local binding
      const used = new RegExp(`\\b${name}\\s*[(.[]`).test(withoutReExports)
      check(!used, `${file}: '${name}' is re-exported, and not called here without an import`)
    }
  }
}

console.log(`\n${found} re-export(s) read across ${files.length} files.`)

/* Self-test: the original bug must still fail this ------------------------ */

const bug = `
import { PKPass } from 'passkit-generator'
export { pem } from '@/lib/pass-auth'
export function buildSignedPass() {
  return PKPass.from({ signerKey: pem(process.env.PASSKIT_KEY_PEM) })
}
`
const bugCode = bug.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const bugImported = new Set()
for (const m of bugCode.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g)) {
  for (const part of m[1].split(',')) bugImported.add(part.trim().split(/\s+as\s+/).pop().trim())
}
let caught = false
for (const m of bugCode.matchAll(RE_EXPORT)) {
  for (const part of m[1].split(',')) {
    const name = part.trim().split(/\s+as\s+/)[0].trim()
    if (bugImported.has(name)) continue
    if (new RegExp(`\\b${name}\\s*[(.[]`).test(bugCode.replace(RE_EXPORT, ''))) caught = true
  }
}
check(caught, 'self-test: the v1.74.0 bug that broke Add to Apple Wallet is still caught')

console.log(failed ? `\nFAILED - ${failed}` : '\nNo re-exported name is called by the file that re-exports it.')
process.exit(failed ? 1 : 0)
