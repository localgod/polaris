/**
 * The global stylesheet (Tailwind + Nuxt UI utilities) is a single large,
 * render-blocking `<link rel="stylesheet">` on every page — Tailwind's JIT
 * scan bundles all utilities used anywhere in the app into one file, so it
 * can't be split per route. Rewriting it to `rel="preload"` + swap-on-load
 * unblocks first paint; a `<noscript>` fallback keeps styling working
 * without JS. Production only — Vite's dev server needs synchronous
 * stylesheet links for CSS HMR.
 */
const STYLESHEET_LINK = /<link([^>]*?)\brel="stylesheet"([^>]*?)>/g

export default defineNitroPlugin((nitroApp) => {
  if (process.env.NODE_ENV !== 'production') return

  nitroApp.hooks.hook('render:html', (html) => {
    html.head = html.head.map(entry =>
      entry.replace(STYLESHEET_LINK, (match, before, after) => {
        const preload = `<link${before}rel="preload" as="style"${after} onload="this.onload=null;this.rel='stylesheet'">`
        const fallback = `<noscript><link${before}rel="stylesheet"${after}></noscript>`
        return `${preload}${fallback}`
      })
    )
  })
})
