/**
 * The public pages, and only those. A page that holds anybody's details is
 * never listed here; robots.js says the same thing from the other side.
 */
const BASE = 'https://www.getturnup.com'
const PAGES = ['/', '/for-trades', '/for-homes', '/next', '/join', '/with-servicem8', '/privacy']

export default function sitemap() {
  return PAGES.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }))
}
