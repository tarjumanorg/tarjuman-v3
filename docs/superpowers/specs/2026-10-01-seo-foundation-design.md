# SEO Foundation: Head, Indexing, Rendering, Structured Data, Agent Readiness

Date: 2026-10-01
Status: Draft for review
Scope: parts 1 and 2 of the SEO system. Content strategy and measurement are a separate spec.

## Goal

Make tarjuman.org correctly discoverable by Google, AI answer engines and browsing agents, with one
place to change each concern. Success is organic traffic from Indonesian students preparing Study in
Saudi applications and other Indonesian-to-Arabic sworn translation queries.

Google's May 2026 guide states that AI Overviews and AI Mode need no special markup, files or
rewriting, and that SEO fundamentals are what count. This spec therefore fixes fundamentals and
agent accessibility; it does not add AI-specific tricks.

## Baseline (measured 2026-09-30, live site)

Desktop Lighthouse: SEO 100, Accessibility 85, Agentic Browsing 33%. Findings this spec addresses:

- `astro-seo` renders the whole head, including `index, follow` on every page, so private pages
  (`/login`, `/dashboard`, `/orders/*`, `/payment/*`, `/checkout/*`, `/maintenance`) are indexable by tag.
- Canonical is `Astro.url.href` (query strings leak in) and has no trailing slash, while the sitemap
  emits trailing slashes.
- llms.txt fails Lighthouse ("does not appear to contain any links").
- The dropzone file input has no label; muted text contrast is 4.42-4.46 (needs 4.5); footer uses `h4`
  with no preceding `h3`.
- Article schema's publisher logo `https://tarjuman.org/logo.png` does not exist; `dateModified` is
  the current time on every request; the FAQ schema says "3-7 hari kerja" while the pricing tiers are
  1, 2, 5 and 9 working days and the visible FAQ says "5-9".
- `LocalBusiness` schema has no street address and implies a storefront.
- `StructuredData.astro` writes `JSON.stringify` output with `set:html` unescaped; database-sourced
  text containing `</script>` would break out of the script tag.
- `Navbar.astro` calls Supabase (user and profile) on every render and sits in the layout, so every
  page, including `/privacy` and `/terms`, is dynamic and cannot be shared across users.
- Mobile CLS was 0.34 in one run that errored and 0.05 on desktop; not reproduced. Not treated as a
  confirmed defect; re-measured after the changes.

## Non-goals

- New content pages, keyword plan, Search Console setup (spec 2).
- WebMCP (experimental; the order flow requires a file upload).
- Changing live URLs, upgrading Astro or the Cloudflare adapter, AI-crawler blocking.
- Edge caching of `/beasiswa-saudi` (it stays server-rendered).

## Design

### 1. Head component (replaces astro-seo)

Astro's docs place SEO metadata in a shared `Head` component inside the layout, not in config.

- New `src/components/Head.astro`. Props: `title`, `description`, `image`, `imageAlt`, `type`.
  Emits `<title>`, description, canonical, Open Graph (`title`, `type`, `url`, `image`,
  `image:width`, `image:height`, `image:alt`, `description`, `locale` `id_ID`, `site_name`) and Twitter
  (`summary_large_image`, title, description, image, alt).
- Canonical is `new URL(Astro.url.pathname, Astro.site)`; query string and hash are dropped.
  Pages no longer pass a `canonical` prop; the existing optional `canonical` prop on `Layout` is removed.
- No `robots` meta is emitted; indexing is controlled by the header in section 2.
- `Layout.astro` renders `Head`, keeps charset, viewport, icon, generator and the GA snippet, and
  gains `imageAlt`. `astro-seo` is removed from `package.json` and the lockfile.
- `astro.config.mjs` sets `trailingSlash: 'never'` to match the canonical URLs already live. The
  build must show the sitemap URLs without trailing slashes; if `@astrojs/sitemap` does not follow the
  setting, the sitemap integration's `serialize` option normalises them.
- OG image: `og-image.webp` declared at its real size, 2715x1448.

### 2. Indexing rules

- `src/middleware.ts` gets one list of private prefixes: `/login`, `/dashboard`, `/orders`,
  `/payment`, `/checkout`, `/maintenance`, `/admin`, `/api`. Any response whose path starts with one
  gets `X-Robots-Tag: noindex, nofollow`. One list, covers HTML and non-HTML responses, no per-page prop.
- `public/robots.txt`: `Disallow` only `/api/` and `/admin/`. The other private paths must stay
  crawlable so Google can read the noindex header. `User-Agent: *` with `Allow: /` is unchanged, so AI
  crawlers remain allowed. Sitemap line unchanged.
- The sitemap filter in `astro.config.mjs` is unchanged: dynamic routes such as `/orders/[id]` never
  enter the sitemap.

### 3. Rendering

- `/`, `/privacy`, `/terms`: `export const prerender = true`.
- `Navbar.astro` becomes presentational, taking `user` and `isAdmin` props and doing no data fetching.
  New `NavbarIsland.astro` does the Supabase `getUser()` and profile-role lookups and renders
  `Navbar` with the result. `Layout.astro` renders
  `<NavbarIsland server:defer><Navbar slot="fallback" user={null} isAdmin={false} /></NavbarIsland>`.
  The fallback is the guest navbar, so crawlers and first paint get full navigation links, and a
  guest's island response is identical markup (no shift). Logged-in users change only the right-hand
  cluster of a fixed `h-16` bar.
- The mobile-menu toggle script moves from `Navbar.astro` to `Layout.astro` using event delegation on
  `document`, so it works after the island swaps the DOM.
- `global.css` adds `server-island { display: contents; }` so the navbar's `sticky top-0` still sticks
  to the viewport rather than to a navbar-height wrapper.
- Island responses are per-user: they must not be publicly cached (`Cache-Control: private, no-store`
  on the island route, set in middleware for paths starting `/_server-islands/`).
- A stable `ASTRO_KEY` is required. Without it, prerendered HTML cached at the CDN or in a browser
  across a deploy fails to decrypt on the new worker and the navbar does not load. Generate with
  `astro create-key`; set it in `.env` locally and in the Cloudflare build and runtime variables.
  This needs a manual action by the site owner.
- `/beasiswa-saudi` stays server-rendered (database-driven requirements) but its HTML no longer varies
  by user.
- Risk to verify, not assume: prerendered pages are static files and may bypass the middleware's
  maintenance-mode redirect. `PUBLIC_MAINTENANCE_MODE` is inlined at build, so a maintenance build is
  a redeploy anyway; the verification step records what actually happens and the docs state it.

### 4. Structured data

- `StructuredData.astro` is replaced by `JsonLd.astro`, which takes a `graph` array, emits one
  `application/ld+json` script with `@context` and `@graph`, and escapes `<` as `<`.
- New `src/lib/site.ts` holds site constants (name, URL, logo `https://tarjuman.org/icon.png`, OG
  image) and builders for the shared nodes:
  - `Organization` (`@id` `https://tarjuman.org/#organization`): name, url, logo ImageObject.
  - `WebSite` (`@id` `.../#website`): name, url, publisher referencing the organization, `inLanguage` `id`.
  - `Service` (`@id` `.../#service`): `serviceType` "Sworn translation", provider referencing the
    organization, `areaServed` Indonesia, one `Offer` per `PRICING_TIERS` entry (IDR price, per page,
    tier label).
- Homepage graph: Organization, WebSite, Service. `LocalBusiness` is removed.
- `/beasiswa-saudi` graph: Organization, `Article`, `FAQPage`, `BreadcrumbList` (Beranda, Beasiswa
  Saudi). Article publisher references the organization; `author` is the organization;
  `dateModified` is a manual constant `CONTENT_UPDATED` in `site.ts` (the requirements table has no
  `updated_at`, so a database-derived date is not available); `datePublished` stays 2026-02-16.
- FAQ: one `faqItems` array in `beasiswa-saudi.astro` supplies both the visible accordion and the
  FAQPage schema (plain-text answers). The processing-time answer is generated from `PRICING_TIERS`,
  which removes the "3-7" and "5-9" contradictions. The accordion markup is unchanged apart from
  rendering answers as plain paragraphs. FAQ rich results are limited to government and health sites,
  so the schema is for consistency and agents, not a rich result.
- Privacy, terms: no structured data.

### 5. Agent readiness and accessibility

- `llms.txt.ts` follows llmstxt.org: H1, blockquote summary, then H2 sections of link lists. A new
  "Pages" section lists `/`, `/beasiswa-saudi`, `/privacy`, `/terms` as `- [Title](url): note`. The
  database-driven requirements and the pricing table stay. Response gains
  `Cache-Control: public, max-age=3600`. Google says llms.txt does nothing for Search; the value is the
  Lighthouse audit and other agents.
- `FileDropzone.svelte`: the file input gets `aria-label="Pilih berkas dokumen"`; the wrapper's
  `role="button"` and `tabindex` are removed so the input is the single focusable control. Drag and
  drop and click-to-open behaviour must be unchanged.
- `Footer.astro`: the three footer `h4` become `h2` with the same classes.
- `global.css`: light-theme `--muted-foreground` lightness lowered from 0.556 to 0.5 (about #6b6b6b),
  which gives at least 4.5:1 on the lightest surfaces used. This darkens muted text site-wide; no
  per-component overrides.

### 6. Documentation

`docs/seo_aeo_system_documentation.md` is updated to match: Head component instead of astro-seo,
`JsonLd` and `site.ts`, dynamic llms.txt, indexing header, rendering model, `ASTRO_KEY`, and the
maintenance-mode finding.

## Files

Create: `src/components/Head.astro`, `src/components/JsonLd.astro`, `src/components/NavbarIsland.astro`,
`src/lib/site.ts`.
Delete: `src/components/StructuredData.astro`.
Modify: `src/layouts/Layout.astro`, `src/components/Navbar.astro`, `src/components/Footer.astro`,
`src/components/FileDropzone.svelte`, `src/middleware.ts`, `src/pages/index.astro`,
`src/pages/privacy.astro`, `src/pages/terms.astro`, `src/pages/beasiswa-saudi.astro`,
`src/pages/llms.txt.ts`, `src/styles/global.css`, `astro.config.mjs`, `public/robots.txt`,
`package.json`, `package-lock.json`, `docs/seo_aeo_system_documentation.md`.

## Verification

1. `npx astro check` and `npx sv check` clean.
2. `astro build`: `dist` contains static HTML for `/`, `/privacy`, `/terms`; sitemap URLs equal the
   canonicals (no trailing slash); no `astro-seo` in the bundle.
3. Rendered head per page type: one canonical without query string, correct OG and Twitter tags.
   `curl -I` on a private path shows `X-Robots-Tag: noindex, nofollow`; public pages do not.
4. Every JSON-LD block parses; node `@id` references resolve; no `</script>` break-out with a hostile
   string in a test fixture.
5. Navbar island: guest and logged-in states both render; mobile menu opens after the swap; navbar
   stays stuck on scroll; no layout shift at the swap.
6. Maintenance-mode behaviour on prerendered pages is observed and recorded.
7. Lighthouse (mobile and desktop) on `/` and `/beasiswa-saudi`: SEO 100; Accessibility at least 95;
   Agentic Browsing llms-txt and accessibility-tree audits passing; CLS under 0.05 on mobile.
8. Server-island behaviour is confirmed in the first build; the Astro docs consulted describe a newer
   Astro and Cloudflare adapter than the installed 5.17.1 and 12.x.

## Assumptions

- There is no physical storefront or verified Google Business Profile, so Organization plus Service
  is used. If one exists, a `LocalBusiness` node with the real address is added to the homepage graph.
- The Article author stays the organization; a named translator would strengthen it but is not decided.
