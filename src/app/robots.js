/**
 * The pages that explain the product are findable; nothing else is.
 *
 * The homepage, /for-trades, /for-homes, /join, /with-servicem8 and /privacy
 * have to be in a search index or nobody finds them (sitemap.js lists them).
 * Everything else here must never be: `/t/<code>` is a customer's name and home
 * address behind nothing but the code in the URL, `/h/<code>` is a household's
 * address and what is coming to it, `/dashboard` is every customer at once,
 * and a leaked link that reaches a search index is leaked to everybody,
 * permanently, in a way that cannot be taken back by revoking it.
 *
 * Each of those pages also sets `robots: { index: false }` in its own
 * metadata. This file is the second lock on the same door, not a replacement
 * for the first: a crawler that ignores one may honour the other, and a new
 * route added without the meta tag is still covered here. `/h/` and `/j/` were
 * missing from it until v1.62.0.
 */
export default function robots() {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/t/', '/h/', '/j/', '/dashboard', '/plan', '/login', '/demo', '/preview', '/api/'],
    }],
    sitemap: 'https://www.getturnup.com/sitemap.xml',
  }
}
