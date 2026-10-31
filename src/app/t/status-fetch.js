'use client'

import { createContext, useContext, useCallback } from 'react'
import { demoResponse } from '@/lib/demo-answers'

/**
 * How the customer's page talks to its own API, and the one switch that
 * keeps the demo on the page.
 *
 * Every component under src/app/t/ that posts a tap gets its `fetch` from
 * `useStatusFetch()` instead of the global. On a real tracking link that is
 * the global `fetch`, unchanged. Inside `<DemoProvider>` (which /demo and
 * /preview wrap themselves in) it is `demoResponse()` from
 * src/lib/demo-answers.js: the request never leaves the browser, the answer
 * is shaped like the route's, and the page updates exactly as it would on a
 * real job. Nobody is notified, because the fixture has nobody behind it.
 *
 * `node scripts/check-demo.mjs` fails any component under src/app/t/ that
 * reaches for the global `fetch(` with an /api/status URL, so a new row
 * cannot quietly start posting from the demo again.
 */
const DemoContext = createContext(false)

export function DemoProvider({ children }) {
  return <DemoContext.Provider value={true}>{children}</DemoContext.Provider>
}

/** True when this page is the demo and nothing it does may reach a server. */
export const useIsDemo = () => useContext(DemoContext)

export function useStatusFetch() {
  const demo = useContext(DemoContext)
  return useCallback(
    (url, init) => (demo ? Promise.resolve(demoResponse(url, init)) : fetch(url, init)),
    [demo],
  )
}
