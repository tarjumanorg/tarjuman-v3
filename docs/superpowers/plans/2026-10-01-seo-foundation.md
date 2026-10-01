# SEO Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tarjuman.org correctly indexable and agent-readable: own head component, a single indexing rule, a prerendered public shell with the navbar as a server island, safe consolidated JSON-LD, and fixes for the Lighthouse findings.

**Architecture:** `astro-seo` is replaced by `Head.astro` (canonical normalised from `Astro.site`). A `sequence()`-wrapped middleware adds `X-Robots-Tag` for private path prefixes from one shared list. `/`, `/privacy`, `/terms` are prerendered; the per-user navbar moves into a `server:defer` island whose fallback is the guest navbar. JSON-LD becomes one `@graph` per page built from `src/lib/site.ts` and serialised by an escaping helper.

**Tech Stack:** Astro 5.17.1, `@astrojs/cloudflare` 12.6.12 (deployed as the Cloudflare **Pages** project `tarjuman-v3`, git-connected, wrangler 4.50; `wrangler.jsonc` is ignored by Pages), `@astrojs/sitemap` 3.7.0, Svelte 5, Tailwind 4, Supabase SSR. Tests: Node's built-in `node:test` (Node 22.20 strips TypeScript natively, no new dependency).

**Spec:** `docs/superpowers/specs/2026-10-01-seo-foundation-design.md`

## Global Constraints

- Verification commands: `npx astro check` and `npx sv check` (not svelte-check). Both must be clean before each commit that touches `.astro`/`.svelte`/`.ts` files.
- Tests: `npm test` (added in Task 1) runs `node --test`. Test files import source with explicit `.ts` extensions (`allowImportingTsExtensions` is on in `astro/tsconfigs/base`).
- Local `.env` has `PUBLIC_MAINTENANCE_MODE=true`. Every local `astro build` / `astro preview` in this plan must override it for that shell: PowerShell `$env:PUBLIC_MAINTENANCE_MODE = "false"`. Never edit `.env` for this.
- Use `gap-*`, `size-*`, `ms-*`/`me-*`/`ps-*`/`pe-*`, never `space-*` or `ml-*`/`mr-*` in code you add (DESIGN.md). Existing code is not reformatted.
- Style through tokens (`bg-background`, `text-muted-foreground`, `ring-ring`), never literal colours, in code you add.
- Stage files explicitly by name; never `git add -A` / `git add .`. New commits only, no amend. Conventional Commits, subject under 72 chars, body explains why. Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Canonical URLs have no trailing slash (except `/`), no query string, no hash. `robots.txt` blocks only `/api/` and `/admin/`. Private-path prefixes (exact list): `/login`, `/dashboard`, `/orders`, `/payment`, `/checkout`, `/maintenance`, `/admin`, `/api`.
- Do not change live URLs, upgrade Astro or the adapter, add WebMCP, or block AI crawlers.
- Logo URL `https://tarjuman.org/icon.png`; OG image `https://tarjuman.org/og-image.webp` declared at 2715x1448.

## Review Focus

Inputs the spec implies but its tasks do not obviously exercise; each has a test or check in the owning task.

1. Path `/orders-archive` or `/loginx` must NOT get `noindex` (prefix match must be segment-aware); `/orders`, `/orders/abc`, `/api/orders/create` must. (Task 1, Task 3)
2. A database string containing `</script>`, `<!--`, or `&` inside JSON-LD must not break out of the script tag. (Task 1)
3. Canonical for `/privacy/`, `/privacy.html`, `/` plus `?utm=x#y` must collapse to `/privacy`, `/privacy`, `/` (prerendered pages are rendered at build time with a trailing-slash pathname). (Task 1, Task 2)
4. During maintenance mode, a non-admin visitor must not have the navbar island fetch redirected to `/maintenance` (the island would inject the whole maintenance page into the navbar). (Task 5)
5. A logged-out visitor on a prerendered page, and a logged-in visitor opening the mobile menu after the island swap, must both work. (Task 5)

---

## Task 1: Shared libraries and test harness

**Files:**
- Create: `src/lib/private-paths.ts`, `src/lib/json-ld.ts`, `src/lib/site.ts`
- Create: `tests/private-paths.test.ts`, `tests/json-ld.test.ts`, `tests/site.test.ts`
- Modify: `package.json` (add `test` script)

**Interfaces:**
- Produces (`private-paths.ts`): `PRIVATE_PATH_PREFIXES: readonly string[]`; `isPrivatePath(pathname: string): boolean`.
- Produces (`json-ld.ts`): `serializeJsonLd(graph: readonly object[]): string` (one JSON string with `@context` and `@graph`, every `<` written as `<`).
- Produces (`site.ts`): `SITE` (const object: `name`, `url`, `logo`, `ogImage`, `ogImageWidth`, `ogImageHeight`, `locale`), `CONTENT_UPDATED: string`, `ORG_ID`, `WEBSITE_ID`, `SERVICE_ID`, `canonicalPath(pathname: string): string`, `organizationNode()`, `websiteNode()`, `serviceNode()`, `breadcrumbNode(items: {name: string; path: string}[])`, `faqNode(items: {question: string; answer: string}[])`, `articleNode(input: {headline: string; description: string; datePublished: string})`. All builders return plain objects without `@context`.

- [ ] **Step 1: Create the working branch and commit spec and plan**

```powershell
git switch -c feat/seo-foundation
git add docs/superpowers/specs/2026-10-01-seo-foundation-design.md docs/superpowers/plans/2026-10-01-seo-foundation.md
git commit -m @'
docs(seo): add SEO foundation spec and implementation plan

Spec 1 of the SEO system: head, indexing, rendering, structured data and
agent readiness.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

- [ ] **Step 2: Add the test script**

In `package.json` `scripts`, add after `"astro": "astro"`:

```json
    "astro": "astro",
    "test": "node --test \"tests/**/*.test.ts\""
```

- [ ] **Step 3: Write the failing tests**

`tests/private-paths.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { isPrivatePath, PRIVATE_PATH_PREFIXES } from "../src/lib/private-paths.ts";

test("lists exactly the spec prefixes", () => {
	assert.deepEqual([...PRIVATE_PATH_PREFIXES], [
		"/login", "/dashboard", "/orders", "/payment", "/checkout", "/maintenance", "/admin", "/api",
	]);
});

test("matches the prefix itself and its children", () => {
	for (const p of ["/login", "/orders", "/orders/abc", "/payment/success/1", "/api/orders/create", "/admin/orders/9", "/checkout/process", "/maintenance"]) {
		assert.equal(isPrivatePath(p), true, p);
	}
});

test("does not match look-alike public paths", () => {
	for (const p of ["/", "/privacy", "/terms", "/beasiswa-saudi", "/llms.txt", "/orders-archive", "/loginx", "/apiary", "/administrator"]) {
		assert.equal(isPrivatePath(p), false, p);
	}
});
```

`tests/json-ld.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { serializeJsonLd } from "../src/lib/json-ld.ts";

test("wraps nodes in @context and @graph", () => {
	const parsed = JSON.parse(serializeJsonLd([{ "@type": "Thing", name: "a" }]));
	assert.equal(parsed["@context"], "https://schema.org");
	assert.deepEqual(parsed["@graph"], [{ "@type": "Thing", name: "a" }]);
});

test("a hostile string cannot close the script tag or open a comment", () => {
	const hostile = `</script><script>alert(1)</script><!-- & "quote"`;
	const out = serializeJsonLd([{ name: hostile }]);
	assert.equal(out.includes("<"), false);
	assert.equal(JSON.parse(out)["@graph"][0].name, hostile);
});
```

`tests/site.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
	canonicalPath, organizationNode, websiteNode, serviceNode, breadcrumbNode, faqNode, articleNode,
	ORG_ID, WEBSITE_ID, SERVICE_ID, SITE, CONTENT_UPDATED,
} from "../src/lib/site.ts";
import { PRICING_TIERS } from "../src/lib/pricing.ts";

test("canonicalPath drops trailing slash, .html, and keeps root", () => {
	assert.equal(canonicalPath("/"), "/");
	assert.equal(canonicalPath("/privacy"), "/privacy");
	assert.equal(canonicalPath("/privacy/"), "/privacy");
	assert.equal(canonicalPath("/privacy.html"), "/privacy");
	assert.equal(canonicalPath("/index.html"), "/");
	assert.equal(canonicalPath("/beasiswa-saudi//"), "/beasiswa-saudi");
});

test("organization has the real logo URL", () => {
	const org = organizationNode();
	assert.equal(org["@id"], ORG_ID);
	assert.equal(org.logo.url, "https://tarjuman.org/icon.png");
	assert.equal(SITE.logo, "https://tarjuman.org/icon.png");
});

test("website references the organization as publisher", () => {
	const site = websiteNode();
	assert.equal(site["@id"], WEBSITE_ID);
	assert.equal(site.publisher["@id"], ORG_ID);
	assert.equal(site.inLanguage, "id");
});

test("service has one IDR offer per pricing tier", () => {
	const svc = serviceNode();
	assert.equal(svc["@id"], SERVICE_ID);
	assert.equal(svc.provider["@id"], ORG_ID);
	assert.equal(svc.offers.length, PRICING_TIERS.length);
	PRICING_TIERS.forEach((tier, i) => {
		assert.equal(svc.offers[i].priceCurrency, "IDR");
		assert.equal(svc.offers[i].price, tier.price);
		assert.equal(svc.offers[i].name, tier.label);
	});
});

test("breadcrumb items are 1-indexed with absolute URLs", () => {
	const crumb = breadcrumbNode([{ name: "Beranda", path: "/" }, { name: "Beasiswa Saudi", path: "/beasiswa-saudi" }]);
	assert.equal(crumb.itemListElement[0].position, 1);
	assert.equal(crumb.itemListElement[1].item, "https://tarjuman.org/beasiswa-saudi");
});

test("faq node maps question and plain-text answer", () => {
	const faq = faqNode([{ question: "Q?", answer: "A." }]);
	assert.equal(faq.mainEntity[0].name, "Q?");
	assert.equal(faq.mainEntity[0].acceptedAnswer.text, "A.");
});

test("article references organization and uses the manual modified date", () => {
	const art = articleNode({ headline: "H", description: "D", datePublished: "2026-02-16" });
	assert.equal(art.publisher["@id"], ORG_ID);
	assert.equal(art.author["@id"], ORG_ID);
	assert.equal(art.dateModified, CONTENT_UPDATED);
	assert.match(CONTENT_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../src/lib/private-paths.ts` (and the other two modules).

- [ ] **Step 5: Implement `src/lib/private-paths.ts`**

```ts
/** Paths that must never be indexed. Single source for the X-Robots-Tag header and the sitemap filter. */
export const PRIVATE_PATH_PREFIXES = [
	"/login",
	"/dashboard",
	"/orders",
	"/payment",
	"/checkout",
	"/maintenance",
	"/admin",
	"/api",
] as const;

export function isPrivatePath(pathname: string): boolean {
	return PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
```

- [ ] **Step 6: Implement `src/lib/json-ld.ts`**

```ts
/** One JSON-LD document. `<` is escaped so database text can never close the script tag or open a comment. */
export function serializeJsonLd(graph: readonly object[]): string {
	return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}
```

- [ ] **Step 7: Implement `src/lib/site.ts`**

```ts
import { PRICING_TIERS } from "./pricing.ts";

export const SITE = {
	name: "Tarjuman",
	url: "https://tarjuman.org",
	logo: "https://tarjuman.org/icon.png",
	ogImage: "https://tarjuman.org/og-image.webp",
	ogImageWidth: 2715,
	ogImageHeight: 1448,
	locale: "id_ID",
} as const;

/** Bump by hand when /beasiswa-saudi content changes materially; there is no database updated_at to derive it from. */
export const CONTENT_UPDATED = "2026-02-16";

export const ORG_ID = `${SITE.url}/#organization`;
export const WEBSITE_ID = `${SITE.url}/#website`;
export const SERVICE_ID = `${SITE.url}/#service`;

/** Prerendered pages see `/privacy/` (or `/privacy.html`) at build time; the canonical is always `/privacy`. */
export function canonicalPath(pathname: string): string {
	const path = pathname.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "").replace(/\/+$/, "");
	return path === "" ? "/" : path;
}

export function organizationNode() {
	return {
		"@type": "Organization",
		"@id": ORG_ID,
		name: SITE.name,
		url: SITE.url,
		logo: { "@type": "ImageObject", url: SITE.logo },
	};
}

export function websiteNode() {
	return {
		"@type": "WebSite",
		"@id": WEBSITE_ID,
		name: SITE.name,
		url: SITE.url,
		inLanguage: "id",
		publisher: { "@id": ORG_ID },
	};
}

export function serviceNode() {
	return {
		"@type": "Service",
		"@id": SERVICE_ID,
		serviceType: "Sworn translation",
		name: "Jasa Penerjemah Tersumpah Indonesia-Arab",
		provider: { "@id": ORG_ID },
		areaServed: { "@type": "Country", name: "Indonesia" },
		offers: PRICING_TIERS.map((tier) => ({
			"@type": "Offer",
			name: tier.label,
			description: `${tier.days} hari kerja, harga per halaman`,
			price: tier.price,
			priceCurrency: "IDR",
			priceSpecification: {
				"@type": "UnitPriceSpecification",
				price: tier.price,
				priceCurrency: "IDR",
				unitText: "halaman",
			},
		})),
	};
}

export function breadcrumbNode(items: { name: string; path: string }[]) {
	return {
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: item.name,
			item: `${SITE.url}${item.path}`,
		})),
	};
}

export function faqNode(items: { question: string; answer: string }[]) {
	return {
		"@type": "FAQPage",
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: { "@type": "Answer", text: item.answer },
		})),
	};
}

export function articleNode(input: { headline: string; description: string; datePublished: string }) {
	return {
		"@type": "Article",
		headline: input.headline,
		description: input.description,
		image: SITE.ogImage,
		author: { "@id": ORG_ID },
		publisher: { "@id": ORG_ID },
		datePublished: input.datePublished,
		dateModified: CONTENT_UPDATED,
	};
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests green (private-paths 3, json-ld 2, site 7).

- [ ] **Step 9: Type-check and commit**

Run: `npx astro check`
Expected: 0 errors (tests import `node:test`; `@types/node` is present). If `astro check` reports errors in `tests/`, fix them before continuing.

```powershell
git add package.json src/lib/private-paths.ts src/lib/json-ld.ts src/lib/site.ts tests/private-paths.test.ts tests/json-ld.test.ts tests/site.test.ts
git commit -m @'
feat(seo): add shared private-path, JSON-LD and site libraries

Pure modules with node:test coverage so later tasks consume tested
primitives: segment-aware private path matching, escaping JSON-LD
serialiser, canonical path normaliser and schema.org node builders.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

---

## Task 2: Head component replaces astro-seo

**Files:**
- Create: `src/components/Head.astro`
- Modify: `src/layouts/Layout.astro` (lines 1-60 head block, Props)
- Modify: `package.json`, `package-lock.json` (remove `astro-seo`)

**Interfaces:**
- Consumes: `SITE`, `canonicalPath` from `src/lib/site.ts`.
- Produces: `Head.astro` Props `{ title: string; description: string; image?: string; imageAlt?: string; type?: string }`. `Layout.astro` Props `{ title?; description?; image?; imageAlt?; type? }` (the `canonical` prop is removed).

- [ ] **Step 1: Create `src/components/Head.astro`**

```astro
---
import { SITE, canonicalPath } from "../lib/site.ts";

export interface Props {
	title: string;
	description: string;
	image?: string;
	imageAlt?: string;
	type?: string;
}

const { title, description, image = SITE.ogImage, imageAlt = title, type = "website" } = Astro.props;

const canonical = new URL(canonicalPath(Astro.url.pathname), Astro.site).href;
const isDefaultImage = image === SITE.ogImage;
---

<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />

<meta property="og:title" content={title} />
<meta property="og:type" content={type} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={image} />
{isDefaultImage && <meta property="og:image:width" content={String(SITE.ogImageWidth)} />}
{isDefaultImage && <meta property="og:image:height" content={String(SITE.ogImageHeight)} />}
<meta property="og:image:alt" content={imageAlt} />
<meta property="og:description" content={description} />
<meta property="og:locale" content={SITE.locale} />
<meta property="og:site_name" content={SITE.name} />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={image} />
<meta name="twitter:image:alt" content={imageAlt} />
```

- [ ] **Step 2: Edit `src/layouts/Layout.astro`**

Replace the imports and frontmatter (lines 1-26) with:

```astro
---
import Navbar from "../components/Navbar.astro";
import Footer from "../components/Footer.astro";
import Head from "../components/Head.astro";
import "../styles/global.css";
import { SITE } from "../lib/site.ts";

// Import Fonts
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/lora";

export interface Props {
	title?: string;
	description?: string;
	image?: string;
	imageAlt?: string;
	type?: string;
}

const {
	title = "Tarjuman - Jasa Penerjemah Tersumpah Resmi",
	description = "Jasa penerjemah tersumpah (sworn translator) resmi untuk persyaratan beasiswa Study in Saudi. Diakui Kemenkumham, Kedutaan, & Universitas di Arab Saudi. Cepat & Terpercaya.",
	image = SITE.ogImage,
	imageAlt,
	type = "website",
} = Astro.props;
---
```

Replace the `<!-- Dynamic SEO handled by astro-seo --> <SEO ... />` block (lines 35-60) with:

```astro
		<Head {title} {description} {image} {imageAlt} {type} />
```

(`imageAlt` undefined falls through to `Head`'s default of `title`.)

- [ ] **Step 3: Remove `astro-seo`**

```powershell
npm uninstall astro-seo
```

Expected: `package.json` and `package-lock.json` lose `astro-seo`; no other dependency changes. Check: `git diff --stat package.json package-lock.json` shows only removals.

- [ ] **Step 4: Verify with a build and rendered head**

```powershell
$env:PUBLIC_MAINTENANCE_MODE = "false"
npx astro check
npm run build
npx astro preview --port 4321
```

In a second shell:

```powershell
$h = (Invoke-WebRequest "http://localhost:4321/beasiswa-saudi?utm_source=x#y" -UseBasicParsing).Content
([regex]::Matches($h, '<link rel="canonical"[^>]*>')).Value
([regex]::Matches($h, '<meta property="og:[^>]*>|<meta name="twitter:[^>]*>')).Value
```

Expected: exactly one `<link rel="canonical" href="https://tarjuman.org/beasiswa-saudi">` (no query string, no trailing slash); OG tags include `og:image:width` 2715, `og:image:height` 1448, `og:locale` `id_ID`; Twitter tags include `twitter:image:alt`; no `robots` meta anywhere (`$h -match 'name="robots"'` is `False`). Also confirm `Select-String -Path dist/_worker.js -Pattern 'astro-seo' -SimpleMatch -Recurse` finds nothing (`Get-ChildItem dist -Recurse -File | Select-String -SimpleMatch 'astro-seo'`).

- [ ] **Step 5: Commit**

```powershell
git add src/components/Head.astro src/layouts/Layout.astro package.json package-lock.json
git commit -m @'
feat(seo): replace astro-seo with an own Head component

Canonical is built from Astro.site plus the normalised pathname so query
strings and trailing-slash variants no longer leak into canonical and og:url.
No robots meta is emitted; indexing moves to a response header.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

---

## Task 3: Indexing rules (X-Robots-Tag, robots.txt)

**Files:**
- Modify: `src/middleware.ts`
- Modify: `public/robots.txt`

**Interfaces:**
- Consumes: `isPrivatePath` from `src/lib/private-paths.ts`.
- Produces: every response whose path is private carries `X-Robots-Tag: noindex, nofollow`; responses for paths starting `/_server-islands/` carry `Cache-Control: private, no-store`. Exports `onRequest` as `sequence(seoHeaders, appMiddleware)`.

- [ ] **Step 1: Restructure `src/middleware.ts`**

Change the import line and rename the existing handler (body untouched except the island exemption in step 2):

```ts
import { defineMiddleware, sequence } from "astro:middleware";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { isPrivatePath } from "./lib/private-paths.ts";

// Wraps the whole chain, so it also covers redirects and JSON error responses from the handler below.
const seoHeaders = defineMiddleware(async ({ url }, next) => {
    const response = await next();
    if (isPrivatePath(url.pathname)) {
        response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    if (url.pathname.startsWith("/_server-islands/")) {
        // Per-user navbar markup must never be shared by a CDN or browser cache.
        response.headers.set("Cache-Control", "private, no-store");
    }
    return response;
});

const appMiddleware = defineMiddleware(async (context, next) => {
```

(The existing `export const onRequest = defineMiddleware(async (context, next) => {` becomes `const appMiddleware = defineMiddleware(async (context, next) => {`; its closing `});` is unchanged.) Append at the end of the file:

```ts

export const onRequest = sequence(seoHeaders, appMiddleware);
```

- [ ] **Step 2: Exempt server islands from the maintenance redirect**

In `appMiddleware`, next to `const isAuthApi = ...` add:

```ts
    const isServerIsland = url.pathname.startsWith("/_server-islands/");
```

and extend the maintenance condition:

```ts
    if (isMaintenanceMode && !isAsset && !isMaintenancePath && !isLoginPath && !isAdminPath && !isAdminApiPath && !isAuthApi && !isServerIsland) {
```

Reason: without it, a non-admin's navbar island request is redirected to `/maintenance` and the browser injects the whole maintenance page into the navbar slot (Review Focus 4). The island itself renders only the navbar.

- [ ] **Step 3: Update `public/robots.txt`**

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: https://tarjuman.org/sitemap-index.xml
```

The other private paths stay crawlable on purpose so Google can read their `noindex` header.

- [ ] **Step 4: Verify headers**

```powershell
$env:PUBLIC_MAINTENANCE_MODE = "false"
npx astro check
npm run build
npx astro preview --port 4321
```

In a second shell (`curl.exe` follows no redirects by default, so redirected private paths are checked on the redirect itself):

```powershell
foreach ($p in "/login","/dashboard","/orders/abc","/payment/abc","/checkout/process","/maintenance","/admin","/api/auth/signout") {
  "$p -> " + ((curl.exe -s -I "http://localhost:4321$p") -match "(?i)^HTTP|x-robots-tag" -join " | ")
}
foreach ($p in "/","/beasiswa-saudi","/privacy","/terms","/llms.txt","/robots.txt") {
  "$p -> " + ((curl.exe -s -I "http://localhost:4321$p") -match "(?i)^HTTP|x-robots-tag" -join " | ")
}
```

Expected: every private path shows `X-Robots-Tag: noindex, nofollow` (including 302/401 responses); no public path shows an `x-robots-tag`. Record any private path that lacks it and fix before committing.

- [ ] **Step 5: Commit**

```powershell
git add src/middleware.ts public/robots.txt
git commit -m @'
feat(seo): noindex private paths via X-Robots-Tag header

One shared prefix list covers HTML and non-HTML responses without
per-page props. robots.txt only blocks /api/ and /admin/ so crawlers can
still read the noindex header on the other private paths. Server island
responses are marked private, no-store and exempt from the maintenance
redirect.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

---

## Task 4: Structured data

**Files:**
- Create: `src/components/JsonLd.astro`
- Delete: `src/components/StructuredData.astro`
- Modify: `src/pages/index.astro` (lines 5, 17-37), `src/pages/beasiswa-saudi.astro` (lines 3, 36-98, breadcrumb at ~104-114, FAQ at ~342-474)

**Interfaces:**
- Consumes: `serializeJsonLd`; `organizationNode`, `websiteNode`, `serviceNode`, `breadcrumbNode`, `faqNode`, `articleNode`; `PRICING_TIERS`, `formatPrice`.
- Produces: `JsonLd.astro` Props `{ graph: readonly object[] }`.

- [ ] **Step 1: Create `src/components/JsonLd.astro`**

```astro
---
import { serializeJsonLd } from "../lib/json-ld.ts";

export interface Props {
	graph: readonly object[];
}

const { graph } = Astro.props;
---

<script is:inline type="application/ld+json" set:html={serializeJsonLd(graph)} />
```

- [ ] **Step 2: Homepage graph in `src/pages/index.astro`**

Replace line 5 (`import StructuredData ...`) with:

```astro
import JsonLd from "../components/JsonLd.astro";
import { organizationNode, websiteNode, serviceNode } from "../lib/site.ts";
```

Delete the `localBusinessData` object (lines 22-33) and the `maxPricePrice`/`maxPriceString` lines (lines 9, 13-15) only if nothing else in the file uses them (`grep -n maxPrice src/pages/index.astro`; they are used only by `localBusinessData`'s `priceRange`). Replace line 37 with:

```astro
	<JsonLd graph={[organizationNode(), websiteNode(), serviceNode()]} />
```

- [ ] **Step 3: Article page in `src/pages/beasiswa-saudi.astro`**

Replace line 3 with:

```astro
import JsonLd from "../components/JsonLd.astro";
import { articleNode, breadcrumbNode, faqNode, organizationNode } from "../lib/site.ts";
```

Change `import { BASE_PRICE, formatPrice } from "../lib/pricing";` to `import { BASE_PRICE, PRICING_TIERS, formatPrice } from "../lib/pricing";`.

Delete `schemaData` and `faqSchema` (lines 36-90) and replace with:

```astro
const description = `Persiapkan dokumen terjemah ijazah & transkrip untuk Study in Saudi ${currentYear}. Cek syarat wajib, hindari kesalahan fatal pemberkasan, dan hitung biayanya.`;

// One list feeds both the visible accordion and the FAQPage schema.
const faqItems = [
    {
        question: "Apakah dokumen harus diterjemahkan tersumpah?",
        answer: "Ya. Universitas di Arab Saudi mewajibkan dokumen akademik (Ijazah, Transkrip) dan legal (SKCK, Akta) diterjemahkan oleh Sworn Translator (Penerjemah Tersumpah) resmi agar memiliki kekuatan hukum. Terjemahan biasa tanpa cap basah penerjemah tersumpah berisiko tinggi ditolak.",
    },
    {
        question: "Berapa lama proses terjemahan selesai?",
        answer: `Tarjuman menawarkan ${PRICING_TIERS.length} pilihan kecepatan, harga per halaman: ${PRICING_TIERS.map((t) => `${t.label} ${t.days} hari kerja (${formatPrice(t.price)})`).join(", ")}. Pesan jauh-jauh hari agar bisa memilih paket Reguler yang paling hemat.`,
    },
    {
        question: "Apakah perlu legalisir Kemenlu & Kemenkumham (Apostille)?",
        answer: "Untuk tahap pendaftaran (upload portal), mayoritas universitas hanya meminta scan asli dan terjemahan tersumpah. Anda belum perlu Apostille atau legalisir saat masih tahap seleksi. Legalisir Kemenlu, Kemenkumham, atau Kedutaan biasanya baru diurus setelah Anda dinyatakan diterima (mendapat Isy'ar Qabul) untuk keperluan pengurusan Visa Pelajar.",
    },
];

const schemaGraph = [
    organizationNode(),
    articleNode({
        headline: `Panduan Lengkap & Checklist Dokumen Beasiswa Arab Saudi ${currentYear}`,
        description:
            "Panduan lengkap persiapan dokumen untuk pendaftaran beasiswa Study in Saudi 2026. Simak syarat wajib, timeline pendaftaran, dan estimasi biaya penerjemah tersumpah.",
        datePublished: "2026-02-16",
    }),
    faqNode(faqItems),
    breadcrumbNode([
        { name: "Beranda", path: "/" },
        { name: "Beasiswa Saudi", path: "/beasiswa-saudi" },
    ]),
];
```

Replace the `<Layout ...>` opening and the two `<StructuredData>` lines (lines 93-98) with:

```astro
<Layout
    title={`Syarat & Checklist Dokumen Pendaftaran Beasiswa Arab Saudi ${currentYear}`}
    {description}
>
    <JsonLd graph={schemaGraph} />
```

Update the visible breadcrumb text (line ~108-113) so it matches the schema: `Home` becomes `Beranda`, `Panduan Beasiswa` becomes `Beasiswa Saudi`.

Replace the three hand-written `<details>` blocks inside the FAQ `<div class="space-y-4">` with one loop that keeps the existing markup and classes, rendering the answer as a paragraph:

```astro
                        {
                            faqItems.map((item) => (
                                <details class="group rounded-lg border bg-card open:ring-1 open:ring-primary/20">
                                    <summary class="flex cursor-pointer list-none items-center justify-between p-4 font-medium sm:p-6">
                                        {item.question}
                                        <span class="opacity-70 transition group-open:rotate-180">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            >
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </span>
                                    </summary>
                                    <div class="border-t px-4 pb-6 pt-2 sm:px-6 text-muted-foreground leading-relaxed">
                                        <p>{item.answer}</p>
                                    </div>
                                </details>
                            ))
                        }
```

- [ ] **Step 4: Delete the old component**

```powershell
git rm src/components/StructuredData.astro
```

- [ ] **Step 5: Verify**

```powershell
$env:PUBLIC_MAINTENANCE_MODE = "false"
npx astro check
npm run build
npx astro preview --port 4321
```

In a second shell, extract and validate every JSON-LD block:

```powershell
foreach ($p in "/","/beasiswa-saudi") {
  $h = (Invoke-WebRequest "http://localhost:4321$p" -UseBasicParsing).Content
  $blocks = [regex]::Matches($h, '<script type="application/ld\+json">(.*?)</script>', 'Singleline')
  "$p blocks=$($blocks.Count)"
  foreach ($b in $blocks) { $j = $b.Groups[1].Value | ConvertFrom-Json; ($j.'@graph' | ForEach-Object { $_.'@type' }) -join "," }
}
```

Expected: one block per page. `/` graph: `Organization,WebSite,Service`. `/beasiswa-saudi` graph: `Organization,Article,FAQPage,BreadcrumbList`. Every `@id` reference (`provider`, `publisher`, `author`) resolves to `https://tarjuman.org/#organization`. `Select-String -InputObject $h -Pattern "3-7|5-9"` finds no match. FAQ question and answer text in the schema equals the visible accordion text. The page still shows three accordion items that open and close.

- [ ] **Step 6: Commit**

```powershell
git add src/components/JsonLd.astro src/pages/index.astro src/pages/beasiswa-saudi.astro
git commit -m @'
feat(seo): consolidate structured data into one escaped JSON-LD graph

Replaces StructuredData with JsonLd (escapes "<" so database text cannot
break out of the script tag). Homepage emits Organization, WebSite and
Service instead of an address-less LocalBusiness. The guide page emits
Organization, Article (real logo, manual dateModified), FAQPage and
BreadcrumbList. The FAQ renders from one list that also builds the schema
and derives processing times from PRICING_TIERS, removing the 3-7 vs 5-9
contradictions.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

(`git rm` already staged the deletion; it is included in this commit.)

---

## Task 5: Navbar as a server island

**Files:**
- Modify: `src/components/Navbar.astro`, `src/layouts/Layout.astro`, `src/styles/global.css`
- Create: `src/components/NavbarIsland.astro`

**Interfaces:**
- Produces: `Navbar.astro` Props `{ user: { email?: string | null } | null; isAdmin: boolean }`, no data fetching and no script. `NavbarIsland.astro`: no props; reads `Astro.locals.user` (set by middleware) and the `profiles.role` row, renders `<Navbar user isAdmin />`.

- [ ] **Step 1: Make `Navbar.astro` presentational**

Replace the frontmatter (lines 1-19) with:

```astro
---
export interface Props {
    user: { email?: string | null } | null;
    isAdmin: boolean;
}

const { user, isAdmin } = Astro.props;
---
```

Delete the `<script>` block at the bottom (lines 156-163). Give the mobile toggle an accessible name: change `<button id="mobile-menu-btn" class="md:hidden p-2 text-foreground">` to `<button id="mobile-menu-btn" class="md:hidden p-2 text-foreground" aria-label="Buka menu navigasi" aria-controls="mobile-menu">`. Do not change any other markup.

- [ ] **Step 2: Create `src/components/NavbarIsland.astro`**

```astro
---
import Navbar from "./Navbar.astro";
import { createClient } from "../lib/supabase";

// Middleware already ran auth.getUser() for this request and stored it in locals.
const user = Astro.locals.user;

let isAdmin = false;
if (user) {
    const supabase = createClient(Astro);
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";
}
---

<Navbar user={user} isAdmin={isAdmin} />
```

- [ ] **Step 3: Wire the island and the menu script into `Layout.astro`**

Replace `import Navbar from "../components/Navbar.astro";` with:

```astro
import Navbar from "../components/Navbar.astro";
import NavbarIsland from "../components/NavbarIsland.astro";
```

Replace `<Navbar />` in `<body>` with:

```astro
		<NavbarIsland server:defer>
			<Navbar slot="fallback" user={null} isAdmin={false} />
		</NavbarIsland>
```

After `<Footer />` add the delegated toggle so it keeps working after the island swaps the DOM:

```astro
		<script>
			document.addEventListener("click", (event) => {
				const target = event.target;
				if (!(target instanceof Element) || !target.closest("#mobile-menu-btn")) return;
				document.getElementById("mobile-menu")?.classList.toggle("hidden");
			});
		</script>
```

- [ ] **Step 4: Keep the navbar sticky**

Append to `src/styles/global.css`:

```css
/* The server island wrapper must not become the sticky navbar's containing block. */
server-island {
  display: contents;
}
```

- [ ] **Step 5: Verify in a real browser**

```powershell
$env:PUBLIC_MAINTENANCE_MODE = "false"
npx astro check
npx sv check
npm run build
npx astro preview --port 4321
```

Use the chrome-devtools tools (`navigate_page`, `take_snapshot`, `evaluate_script`, `resize_page`, `take_screenshot`) on `http://localhost:4321/beasiswa-saudi`:

1. Guest: navbar shows `Beranda`, `Dashboard`, `Masuk`; the page source (before JS) already contains the same links (the fallback).
2. In `list_network_requests`, find the `/_server-islands/NavbarIsland` request and confirm the response header `cache-control: private, no-store`.
3. Resize to 375 px wide, click the menu button: `#mobile-menu` loses `hidden`; click again: it returns.
4. Scroll 1000 px down: `evaluate_script` returns `document.querySelector("nav").getBoundingClientRect().top === 0` (still stuck).
5. Log in with a real test account (the user supplies credentials; if none are available say so and mark this sub-step unverified). Expect `email`, `Keluar` on the right; for an admin account also `Admin Area`. Open the mobile menu after the swap and confirm it still toggles.
6. Layout shift: run `performance_start_trace` / `performance_stop_trace` on `/beasiswa-saudi`; CLS stays under 0.05 and no shift entry is attributed to the navbar.
7. Maintenance regression (Review Focus 4): stop preview, rebuild with `$env:PUBLIC_MAINTENANCE_MODE = "true"`, preview, request `/_server-islands/NavbarIsland` with `curl.exe -s -I`: expected a non-redirect response (not `302 /maintenance`). Then restore `"false"`.

- [ ] **Step 6: Commit**

```powershell
git add src/components/Navbar.astro src/components/NavbarIsland.astro src/layouts/Layout.astro src/styles/global.css
git commit -m @'
refactor(layout): move the per-user navbar into a server island

Navbar is now presentational; NavbarIsland resolves the user and role.
The guest navbar is the island fallback, so crawlers and first paint get
full navigation and layout HTML no longer varies by user. This unblocks
prerendering the public pages.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

---

## Task 6: Prerender public pages and make URLs consistent

**Files:**
- Modify: `src/pages/index.astro`, `src/pages/privacy.astro`, `src/pages/terms.astro`, `astro.config.mjs`, `.env.example`

**Interfaces:**
- Consumes: `isPrivatePath` from `src/lib/private-paths.ts`.
- Produces: static HTML for `/`, `/privacy`, `/terms` in `dist`; sitemap URLs equal the canonicals; all three paths serve without a redirect from the slash-less URL.

- [ ] **Step 1: Prerender the three pages**

Add as the first line inside each frontmatter, before the imports, in `src/pages/index.astro`, `src/pages/privacy.astro`, `src/pages/terms.astro`:

```astro
export const prerender = true;
```

- [ ] **Step 2: URL configuration in `astro.config.mjs`**

Add the import below the existing imports:

```js
import { isPrivatePath } from './src/lib/private-paths.ts';
```

Add `trailingSlash: 'never',` next to `site:`. Replace the `sitemap({...})` call with:

```js
    sitemap({
      // Prerendered pages arrive with a trailing slash and on-demand routes without; keep one URL each.
      filter: (page) => !isPrivatePath(new URL(page).pathname),
      serialize: (() => {
        const seen = new Set();
        return (item) => {
          const url = new URL(item.url);
          if (url.pathname !== '/') url.pathname = url.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
          if (seen.has(url.href)) return undefined;
          seen.add(url.href);
          item.url = url.href;
          return item;
        };
      })(),
    }),
```

Note: the old filter matched `/login/` with a trailing slash and would silently stop matching under `trailingSlash: 'never'`; the shared list fixes that. If Astro cannot load a `.ts` import from the config file, fall back to an inline copy of the prefix list in `astro.config.mjs` and add a comment pointing at `src/lib/private-paths.ts`.

- [ ] **Step 3: Serve prerendered pages at their slash-less URL on Cloudflare Pages**

The site is a Cloudflare Pages project, not a Workers static-assets deploy, so `assets.html_handling` in `wrangler.jsonc` does not apply. Pages serves `privacy/index.html` at `/privacy/` and redirects `/privacy` to it, contradicting the canonical. Pages serves `privacy.html` at `/privacy` and redirects `/privacy/` and `/privacy.html` to it. In `astro.config.mjs` add:

```js
  build: { format: 'file' },
```

(Astro docs pair `file` with `trailingSlash: 'never'`. During the build `Astro.url.pathname` becomes `/privacy.html`; `canonicalPath` already strips `.html`, and the sitemap `serialize` above strips it too.) Verify the routing locally with `npx wrangler pages dev dist --port 4321` in Step 5, which uses Pages' asset routing.

- [ ] **Step 4: Generate a stable `ASTRO_KEY`**

```powershell
npx astro create-key
```

Append the printed `ASTRO_KEY=...` line to the local `.env` (gitignored) without echoing it. Set it on the Pages project (production) with wrangler, piping the value on stdin so it never appears in a command line:

```powershell
$k = ((Get-Content .env | Where-Object { $_ -like 'ASTRO_KEY=*' }) -replace '^ASTRO_KEY=','').Trim('"')
$k | npx wrangler pages secret put ASTRO_KEY --project-name tarjuman-v3
npx wrangler pages secret list --project-name tarjuman-v3
```

Expected: `ASTRO_KEY: Value Encrypted` in the list. Wrangler cannot set Pages build-time variables separately, so after the first deploy confirm the island loads on production; if it does not, the secret is not visible at build time and the same value must be added as a plain environment variable in the dashboard. Add a placeholder to `.env.example`:

```
# Stable key for server island props. Generate with `npx astro create-key`.
# Must be the same at build and runtime on Cloudflare Pages, otherwise
# prerendered pages cached across a deploy cannot decrypt the navbar island.
ASTRO_KEY=
```

Do not print the key value into chat or commit it.

- [ ] **Step 5: Build and verify static output, sitemap and redirects**

```powershell
$env:PUBLIC_MAINTENANCE_MODE = "false"
npx astro check
npx sv check
npm run build 2>&1 | Tee-Object build.log
```

Expected in `build.log`: no error. Record any warning containing `Astro.request.headers` (the middleware reads headers while prerendering); it is expected to be only a warning. Then:

```powershell
Get-ChildItem dist -Recurse -Filter index.html | Select-Object -ExpandProperty FullName   # dist\index.html, dist\privacy\index.html, dist\terms\index.html
Select-String -Path dist\index.html -Pattern "server-island" -SimpleMatch | Select-Object -First 1
[xml]$s = Get-Content dist\sitemap-0.xml; $s.urlset.url.loc
```

Expected: static HTML exists for `/`, `/privacy`, `/terms`; `dist\index.html` contains `server-island`; sitemap lists exactly `https://tarjuman.org/`, `https://tarjuman.org/beasiswa-saudi`, `https://tarjuman.org/privacy`, `https://tarjuman.org/terms` (no trailing slash except root, no duplicates, no private paths). `Remove-Item build.log` afterwards (it is not committed).

Serve with Pages routing (`npx wrangler pages dev dist --port 4321`; `.env` values are not injected there, so the navbar island may fail to read the user, which does not matter for this check) and check:

```powershell
foreach ($p in "/privacy","/privacy/","/terms","/terms/","/beasiswa-saudi/","/login/") {
  "$p -> " + ((curl.exe -s -I "http://localhost:4321$p") -match "(?i)^HTTP|^location" -join " | ")
}
foreach ($p in "/","/privacy","/terms") {
  $h = (Invoke-WebRequest "http://localhost:4321$p" -UseBasicParsing).Content
  "$p canonical: " + [regex]::Match($h,'<link rel="canonical" href="([^"]+)"').Groups[1].Value
}
```

Expected: `/privacy` and `/terms` return `200` directly; the trailing-slash variants redirect (301/308) to the slash-less URL; canonicals are `https://tarjuman.org/`, `https://tarjuman.org/privacy`, `https://tarjuman.org/terms`. If `/privacy` redirects to `/privacy/` or `/privacy.html` is served without redirect, record the observed behaviour as a ledger ruling and adjust (for example `build.format: 'preserve'`).

- [ ] **Step 6: Record maintenance-mode behaviour on prerendered pages**

```powershell
$env:PUBLIC_MAINTENANCE_MODE = "true"
npm run build
Get-Content dist\index.html -TotalCount 5
Get-Content dist\privacy\index.html -TotalCount 5
$env:PUBLIC_MAINTENANCE_MODE = "false"
```

Record exactly what is observed (for example, `dist/index.html` is a redirect stub to `/maintenance`, or it is the normal page). This result goes into the docs in Task 8. If prerendered pages ignore maintenance mode, note that a maintenance deploy must be a redeploy with the flag set at build time; do not change the middleware for this.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/index.astro src/pages/privacy.astro src/pages/terms.astro astro.config.mjs .env.example
git commit -m @'
feat(seo): prerender public pages and unify trailing-slash URLs

/, /privacy and /terms are static; the navbar island keeps them
per-user. trailingSlash is never, the sitemap is normalised and filtered
with the shared private-path list, and build.format file makes Pages serve
the slash-less URL. Documents the stable
ASTRO_KEY needed for cached pages that contain server islands.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

---

## Task 7: Agent readiness and accessibility fixes

**Files:**
- Modify: `src/pages/llms.txt.ts`, `src/components/FileDropzone.svelte`, `src/components/Footer.astro`, `src/styles/global.css`

- [ ] **Step 1: Make `llms.txt` follow llmstxt.org**

In `src/pages/llms.txt.ts`, replace the opening of the template (from `# Tarjuman - Sworn Translation Services` through the paragraph, lines 59-61) with:

```
# Tarjuman - Sworn Translation Services

> Tarjuman is an official, government-certified sworn translation service based in Indonesia. We specialize in translating academic and legal documents from Indonesian to Arabic, primarily for the "Study in Saudi" scholarship program, as well as for general embassy or legal requirements. Our translators hold official decrees (SK) from the Indonesian Ministry of Law and Human Rights (Kemenkumham).

## Pages

- [Beranda](https://tarjuman.org/): Upload documents, see the price instantly and order a sworn translation online.
- [Panduan Beasiswa Arab Saudi](https://tarjuman.org/beasiswa-saudi): Document checklist, timeline and cost estimate for Study in Saudi applications.
- [Kebijakan Privasi](https://tarjuman.org/privacy): How personal data and uploaded documents are handled.
- [Syarat & Ketentuan](https://tarjuman.org/terms): Terms of use for the translation service.
```

(Everything from `## Core Data & Services` onward stays unchanged.) Add a cache header to the response:

```ts
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
```

- [ ] **Step 2: Fix the dropzone input label and focus**

In `src/components/FileDropzone.svelte`, on the dropzone wrapper `<div ... ondragover ... role="button" tabindex="0">` delete `role="button"` and `tabindex="0"`, and add `has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring` to its class list (the invisible input is now the only focusable control, and the wrapper must show its focus). On the `<input type="file" ...>` add:

```svelte
            aria-label="Pilih berkas dokumen"
```

Run `npx sv check`. If it now warns `a11y_no_static_element_interactions` for the wrapper's drag handlers, add this line directly above the wrapper `<div`:

```svelte
    <!-- svelte-ignore a11y_no_static_element_interactions -- drop target only; the file input inside is the keyboard control -->
```

Drag and drop and click-to-open must behave exactly as before.

- [ ] **Step 3: Footer headings**

In `src/components/Footer.astro` change the three `<h4 class="font-serif font-bold text-foreground">` (Navigasi, Layanan, Kontak) and their closing tags to `<h2 ...>` / `</h2>` with identical classes.

- [ ] **Step 3b: Remove the street address from the footer**

The business has no public storefront (the owner asked for the address to be removed). In `src/components/Footer.astro` delete the whole `<li>` in the Kontak list that contains the map-pin SVG and the text `Jl. Raya Masjid Al Hidayah No.1A, Pejaten Barat, Ps. Minggu, Jakarta Selatan 12510`. Then search the repo for other copies (`Select-String -Path (Get-ChildItem src,docs,public -Recurse -File).FullName -Pattern 'Pejaten|Masjid Al Hidayah'`); fix any user-facing hit, leave unrelated hits and report them. `LocalBusiness` stays out of the schema.

- [ ] **Step 4: Muted text contrast**

In `src/styles/global.css` line 21 change the light-theme value:

```css
  --muted-foreground: oklch(0.5 0 0);
```

The dark theme value (line 55) is unchanged. No per-component overrides.

- [ ] **Step 5: Verify**

```powershell
$env:PUBLIC_MAINTENANCE_MODE = "false"
npx astro check
npx sv check
npm run build
npx astro preview --port 4321
```

Then:

```powershell
$t = (Invoke-WebRequest "http://localhost:4321/llms.txt" -UseBasicParsing)
$t.Headers["Cache-Control"]
([regex]::Matches($t.Content, '\]\(https://tarjuman\.org[^)]*\)')).Count   # expect 4
$t.Content -match '(?m)^> '                                                # expect True
```

In the browser (chrome-devtools `take_snapshot` on `/`): the file input has the accessible name `Pilih berkas dokumen`; Tab reaches it once (no extra stop on the wrapper) and the wrapper shows a ring; dropping or choosing a PDF still adds it to the list. `Footer` headings in the accessibility tree are level 2.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/llms.txt.ts src/components/FileDropzone.svelte src/components/Footer.astro src/styles/global.css
git commit -m @'
fix(a11y): label dropzone input, fix footer headings and muted contrast

llms.txt gets a blockquote summary and a Pages link list so the
Lighthouse llms-txt audit can pass. The file input becomes the single
labelled focusable control, footer h4 become h2, and light muted text is
darkened from 0.556 to 0.5 lightness to reach 4.5:1.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

---

## Task 8: Documentation

**Files:**
- Modify: `docs/seo_aeo_system_documentation.md`

- [ ] **Step 1: Rewrite the stale sections**

Replace section 1 (`## 1. Traditional SEO (astro-seo)` through its `### How to Tweak` list) with:

```markdown
## 1. Traditional SEO (`Head.astro`)

All `<head>` metadata (title, description, canonical, Open Graph, Twitter Cards) is rendered by `src/components/Head.astro`, which `src/layouts/Layout.astro` includes. Pages pass `title`, `description`, and optionally `image`, `imageAlt`, `type` to `Layout`.

*   **Canonical:** built from `Astro.site` plus the normalised pathname (`canonicalPath` in `src/lib/site.ts`): no query string, no hash, no trailing slash (except `/`), no `.html`. Pages never pass a canonical.
*   **No robots meta.** Indexing is controlled by a response header (section 4).
*   **Defaults** live in `Layout.astro`; site constants (name, URL, logo, OG image and its 2715x1448 size) live in `src/lib/site.ts`.
*   To change the social preview image, replace `public/og-image.webp` and update `ogImage`, `ogImageWidth`, `ogImageHeight` in `src/lib/site.ts`.
```

Replace section 2's "How it Works", "Schemas We Use" and "How to Tweak" with:

```markdown
### How it Works
`src/components/JsonLd.astro` takes a `graph` array and emits one `application/ld+json` script (`@context` plus `@graph`) through `serializeJsonLd` (`src/lib/json-ld.ts`), which escapes `<` so database text cannot close the script tag. Shared nodes and builders live in `src/lib/site.ts`.

### Schemas We Use
1.  **Homepage:** `Organization`, `WebSite`, `Service` (one `Offer` per `PRICING_TIERS` entry, so prices and days never drift from the pricing source). There is no `LocalBusiness`; add one with the real address only if a verified Google Business Profile exists.
2.  **`/beasiswa-saudi`:** `Organization`, `Article`, `FAQPage`, `BreadcrumbList`. FAQ answers come from the single `faqItems` list in the page, which also renders the visible accordion. Google restricts FAQ rich results to government and health sites, so this is for consistency and agents.
3.  Privacy and terms have no structured data.

### How to Tweak
*   Change prices or processing days only in `src/lib/pricing.ts`; schema, FAQ answer and llms.txt follow.
*   Bump `CONTENT_UPDATED` in `src/lib/site.ts` when the guide changes materially (it feeds `Article.dateModified`).
*   Add or edit FAQ entries in `faqItems` in `src/pages/beasiswa-saudi.astro`.
```

Replace section 3 with:

```markdown
## 3. Autonomous Agent Optimization (`llms.txt`)

`/llms.txt` is generated by `src/pages/llms.txt.ts` (there is no static file). It follows llmstxt.org: an H1, a blockquote summary, and H2 sections. The `Pages` section lists the public pages as links; the pricing table comes from `PRICING_TIERS` and the document requirements from the `scholarship_requirements` table, so nothing needs to be edited by hand when prices or requirements change. Add new public pages to the `Pages` list. The response is cached for an hour. Google states llms.txt has no effect on Search; it exists for other agents and the Lighthouse audit.
```

Replace the "How to Tweak" of section 5 sitemap with:

```markdown
### How to Tweak
*   `trailingSlash` is `never`; the sitemap `serialize` hook in `astro.config.mjs` strips trailing slashes and removes duplicates, and its `filter` excludes private paths using `src/lib/private-paths.ts`. After a build, `dist/sitemap-0.xml` URLs must equal the page canonicals.
*   If the domain changes, update `site` in `astro.config.mjs` and `SITE.url` in `src/lib/site.ts`.
```

Append two new sections:

```markdown
## 6. Indexing Rules

`src/lib/private-paths.ts` holds the one list of private prefixes (`/login`, `/dashboard`, `/orders`, `/payment`, `/checkout`, `/maintenance`, `/admin`, `/api`). `src/middleware.ts` adds `X-Robots-Tag: noindex, nofollow` to every response on those paths (HTML, redirects and JSON). `public/robots.txt` disallows only `/api/` and `/admin/`: the other private paths must stay crawlable so Google can read the header. Add a new private area by adding its prefix to the shared list.

## 7. Rendering Model

*   `/`, `/privacy`, `/terms` are prerendered (static HTML on Cloudflare Pages; `_routes.json` excludes them from the Worker, so middleware does not run at request time for them). `/beasiswa-saudi` is server-rendered because its requirements come from the database, but its HTML does not vary by user.
*   The per-user navbar is `src/components/NavbarIsland.astro`, a `server:defer` island. Its fallback is the guest `Navbar`, so crawlers and first paint always get full navigation. Island responses are `Cache-Control: private, no-store` (set in middleware) and are exempt from the maintenance redirect. The mobile menu toggle is a delegated listener in `Layout.astro`.
*   **`ASTRO_KEY` is required.** Generate one with `npx astro create-key` and set the same value as a build variable and a runtime variable in Cloudflare (and in local `.env`). Without it each build uses a new random key, and a cached prerendered page from a previous deploy cannot decrypt its island request.
*   The site is a Cloudflare Pages project. `build.format: 'file'` makes Pages serve `/privacy` directly and redirect `/privacy/` to it (`wrangler.jsonc` is ignored by Pages).
*   **Maintenance mode on prerendered pages:** MAINTENANCE_RESULT_PLACEHOLDER
```

Before saving, replace the literal text `MAINTENANCE_RESULT_PLACEHOLDER` with the observation you recorded in Task 6 Step 6 (one or two sentences stating what `dist/index.html` and `dist/privacy/index.html` contained under `PUBLIC_MAINTENANCE_MODE=true`, and that `PUBLIC_MAINTENANCE_MODE` is inlined at build so toggling maintenance mode is a redeploy). The file must not contain the placeholder when committed: `Select-String -Path docs/seo_aeo_system_documentation.md -Pattern PLACEHOLDER` returns nothing.

- [ ] **Step 2: Commit**

```powershell
git add docs/seo_aeo_system_documentation.md
git commit -m @'
docs(seo): update SEO and AEO documentation for the new system

Describes the Head component, JSON-LD graph, generated llms.txt,
indexing header, rendering model, ASTRO_KEY requirement and observed
maintenance-mode behaviour on prerendered pages.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
'@
```

---

## Task 9: Final verification

**Files:** none changed unless a check fails (then fix in the owning task's files and commit separately).

- [ ] **Step 1: Static checks and tests**

```powershell
$env:PUBLIC_MAINTENANCE_MODE = "false"
npx astro check
npx sv check
npm test
npm run build
```

Expected: all clean, `npm test` green, build succeeds.

- [ ] **Step 2: Local Lighthouse (mobile and desktop) on `/` and `/beasiswa-saudi`**

Start `npx astro preview --port 4321`, then run the chrome-devtools `lighthouse_audit` tool for each URL and device (use `emulate` for mobile). Targets: SEO 100; Accessibility at least 95; Agentic Browsing llms-txt and accessibility-tree audits passing; mobile CLS under 0.05. Record each score. If Accessibility is below 95, read the failing audits and fix the cause in the owning file (for example further contrast pairs); do not suppress audits.

- [ ] **Step 3: Server-island behaviour confirmed (spec item 8)**

On the first build, confirm in the browser that the island request is a `GET /_server-islands/NavbarIsland?...`, responds 200, and replaces the fallback; confirm `list_console_messages` shows no decryption or island errors. Note any divergence from the Astro docs consulted (docs describe a newer Astro and adapter than 5.17.1 / 12.6.12).

- [ ] **Step 4: Write up results and hand over**

Report: scores, the maintenance-mode finding, whether `html_handling` or the `build.format: 'file'` fallback was needed, any logged-in sub-step left unverified, and the manual actions for the site owner (set `ASTRO_KEY` in Cloudflare build and runtime variables before deploying; re-run Lighthouse on https://tarjuman.org after the deploy; decide on a `LocalBusiness` node, see below). Then follow superpowers:finishing-a-development-branch.

---

## Spec Coverage Self-Review

| Spec section | Task |
| --- | --- |
| 1 Head component, canonical, `imageAlt`, astro-seo removal, OG size | Task 1 (`canonicalPath`, `SITE`), Task 2 |
| 1 `trailingSlash: 'never'` and sitemap normalisation | Task 6 |
| 2 Indexing header, shared list, robots.txt, sitemap filter intent | Task 1, Task 3, Task 6 |
| 3 Prerender, Navbar split, island, script move, CSS, no-store, ASTRO_KEY, maintenance risk | Tasks 3, 5, 6 |
| 4 JsonLd, `site.ts`, graphs, FAQ unification, hostile-string test | Tasks 1, 4 |
| 5 llms.txt, dropzone, footer, contrast | Task 7 |
| 6 Documentation | Task 8 |
| Verification 1-8 | Tasks 2-9 (each task verifies its own area; Task 9 runs Lighthouse and the island confirmation) |

Deviations from the spec, each forced by a finding while researching, and what to review:

1. **Sitemap filter is changed, not left unchanged.** Under `trailingSlash: 'never'` the old filter's `/login/`-style substrings stop matching, which would put private pages in the sitemap. It now uses the shared private-path list. (Task 6)
2. **`build.format: 'file'` in `astro.config.mjs`.** The site is a Cloudflare Pages project; Pages would redirect `/privacy` to `/privacy/` once prerendered as `privacy/index.html`, contradicting the canonical. (Not in the spec.)
3. **`canonicalPath` strips a trailing slash and `.html`.** Prerendered pages see `/privacy/` at build time, so `new URL(Astro.url.pathname, Astro.site)` alone would produce slash canonicals. (Task 1)
4. **Middleware exempts `/_server-islands/` from the maintenance redirect** and uses `sequence()` so headers also reach redirect and JSON error responses. (Task 3)
5. **`NavbarIsland` reads `Astro.locals.user`** (already fetched by middleware) instead of calling `getUser()` again; only the role lookup remains. (Task 5)
6. **Small additions needed to meet the stated acceptance criteria:** `aria-label` on the mobile menu button (Task 5) and a `has-[:focus-visible]` ring on the dropzone wrapper (Task 7) so removing its `tabindex` does not remove visible keyboard focus; the visible breadcrumb text is changed to `Beranda` / `Beasiswa Saudi` to match the BreadcrumbList. (Tasks 4, 5, 7)

Resolved by the owner: no storefront, the footer address is removed (Task 7) and `LocalBusiness` stays out.
