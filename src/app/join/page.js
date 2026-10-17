import SiteShell from '@/components/SiteShell'
import Join from './Join'

/**
 * Get on the list, one step at a time, with the card filling in above.
 * The working parts, and the rules about what leaves the phone, are in Join.jsx.
 */
export const metadata = {
  title: 'Get on the list | TurnUp',
  description: 'For trades and for homes. Your card builds as you sign up.',
  robots: { index: true, follow: true },
}

export default function JoinPage() {
  return (
    <SiteShell id="join" wide>
      <div className="mt-8"><Join /></div>
    </SiteShell>
  )
}
