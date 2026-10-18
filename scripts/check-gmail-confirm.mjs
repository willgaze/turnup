/**
 * Gmail's forwarding confirmation, read or rejected.
 *
 *   node scripts/check-gmail-confirm.mjs
 */
import { readForwardingConfirm } from '../src/lib/gmail-confirm.js'

const REAL = {
  from: 'Gmail Team <forwarding-noreply@google.com>',
  subject: '(#123456789) Gmail Forwarding Confirmation - Receive Mail from sarah@example.com',
  text: `sarah@example.com has requested to automatically forward mail to your email address cards+q7rmt4ndkw82jp@in.getturnup.com.
Confirmation code: 123456789

To allow sarah@example.com to automatically forward mail to your address, please click the link below to confirm the request:

https://mail-settings.google.com/mail/vf-%5BANGjdJ8abc%5D-abc123def456.

If you click the link and it appears to be broken, please copy and paste it into a new browser window.`,
}

const CASES = [
  ['the real shape', REAL, { code: '123456789', url: 'https://mail-settings.google.com/mail/vf-%5BANGjdJ8abc%5D-abc123def456' }],
  ['a subject claiming it, from elsewhere', { ...REAL, from: 'Gmail <noreply@g00gle-mail.example>' }, null],
  ['google.com, but a newsletter', { ...REAL, subject: 'Your Google Account this month' }, null],
  ['a link to somewhere else is not taken', { ...REAL, text: 'Confirmation code: 987654321 https://evil.example/mail/vf-x' }, { code: '987654321', url: null }],
  ['nothing to show', { ...REAL, text: 'Hello' }, null],
  ['empty', {}, null],
]

let failed = 0
for (const [name, input, want] of CASES) {
  const got = readForwardingConfirm(input)
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failed += 1
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : ` -> ${JSON.stringify(got)} (wanted ${JSON.stringify(want)})`}`)
}
console.log(failed ? `\nFAILED — ${failed}` : `\nPASSED — ${CASES.length} checks`)
process.exit(failed ? 1 : 0)
