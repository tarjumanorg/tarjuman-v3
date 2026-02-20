# Tarjuman SEO & AEO System Documentation

This document explains the technical implementation of Tarjuman's search optimization system. It is designed to help developers and content managers understand how to tweak and maintain the system in the future.

Our strategy is divided into two primary pillars:
1.  **Traditional SEO (Search Engine Optimization):** Designed for Google crawlers to index our pages, generate rich snippets, and rank for visual search results (clicks).
2.  **AEO (Answer Engine Optimization) & GEO (Generative Engine Optimization):** Designed for AI agents (ChatGPT, Gemini, Google AI Overviews, AutoGPT) that read the internet to answer user questions directly or extract data autonomously.

---

## 1. Traditional SEO (`astro-seo`)

We manage all traditional `<head>` metadata (Title, Meta Description, Canonical URLs, OpenGraph, Twitter Cards) using the `astro-seo` library.

### How it Works
The `<SEO />` component is injected globally into `src/layouts/Layout.astro`. It accepts a `Props` interface so that any specific page can override the default site-wide metadata.

**Default Configuration (`src/layouts/Layout.astro`):**
If a page does not pass specific SEO props, it relies on the global defaults:
*   **Title:** "Tarjuman - Jasa Penerjemah Tersumpah Resmi"
*   **Description:** General sworn translation pitch.
*   **Image:** `https://tarjuman.org/og-image.webp` (Optimized WebP file)

**Page-Level Overrides (e.g., `src/pages/beasiswa-saudi.astro`):**
When creating a new page, pass the `title` and `description` props manually into the Layout to target specific keywords.
```astro
---
import Layout from "../layouts/Layout.astro";
---
<Layout 
    title="Syarat & Checklist Dokumen Pendaftaran Beasiswa Arab Saudi 2026"
    description="Persiapkan dokumen terjemah ijazah & transkrip untuk Study in Saudi 2026..."
>
    <!-- Page Content -->
</Layout>
```

### How to Tweak:
*   To change the default fallback meta descriptions, edit `src/layouts/Layout.astro`.
*   To change a specific page's meta description, edit the `<Layout title="..." description="...">` tags on that specific `.astro` file.
*   To update the social media preview image, replace `public/og-image.webp` with a new `1200x630` optimized WebP image.

---

## 2. AEO (Answer Engine Optimization) via JSON-LD

AI models rely heavily on Structured Data (JSON-LD) to understand the "Entities" on a page. Rather than parsing messy HTML divs, JSON-LD feeds data to Google AI and ChatGPT in a clean, mathematical dictionary format.

### How it Works (`src/components/StructuredData.astro`)
This is a custom Astro component that safely injects raw JSON into the `<head>` of the document.

**Component Implementation:**
```astro
---
export interface Props {
    type: "FAQPage" | "LocalBusiness" | "Article" | "WebSite";
    data: any;
}
const { type, data } = Astro.props;
---
<script type="application/ld+json" set:html={JSON.stringify(data)} />
```

### Schemas We Use:
1.  **`LocalBusiness` (Homepage):** Defines Tarjuman's brand, URL, image, and most importantly, our **price range** (`Rp75.000 - Rp300.000`).
2.  **`FAQPage` (Scholarship Page):** Wraps our "Frequently Asked Questions" into a strict Q&A format. When a user asks Google "Apakah dokumen beasiswa saudi wajib diterjemahkan tersumpah?", Google AI Overview extracts the answer directly from this JSON-LD block.
3.  **`Article` (Scholarship Page):** Defines the scholarship guide as an educational article with a publish date and author.

### How to Tweak:
*   Open the relevant page (e.g., `src/pages/index.astro`).
*   Locate the JSON object at the top of the file (e.g., `const localBusinessData = { ... }` or `const faqSchema = { ... }`).
*   Modify the text, update the prices, or add new FAQ array objects.
*   The `StructuredData` component will automatically inject your updated JSON string into the HTML.

---

## 3. Autonomous Agent Optimization (`llms.txt`)

While chat interfaces use JSON-LD, autonomous AI scrapers (like AutoGPT) scanning the web for research often prefer highly dense, distraction-free markdown. We utilize the emerging `llms.txt` standard to feed them exclusively what they need.

### How it Works
We have a static markdown file located at `public/llms.txt`. 

This file acts as a stripped-down, machine-readable manifest containing:
*   Tarjuman's core focus (Sworn translation ID -> AR).
*   Our precise Pricing Matrix formatted as a clear Markdown Table.
*   The exact required documents for the Saudi Scholarship.

### How to Tweak:
*   If our pricing changes, or if Saudi Arabia introduces a new document requirement (e.g., a new medical test), you **must** update `public/llms.txt` in addition to updating the visual React/Svelte components. This ensures AI agents don't scrape and regurgitate outdated pricing.

---

## 4. Semantic HTML Best Practices

To ensure AI crawlers can still understand our visual UI, we follow strict Semantic HTML-5 structures.

### The Rules:
*   **Don't use `<div>` for everything.**
*   Use `<article>` around self-contained content (like blog posts or the main guide).
*   Use `<aside>` for loosely related content (like the Promo Banner or the Calculator widget).
*   Use `<section>` to break up distinct topics on the same page.
*   Maintain a strict Headings hierarchy (`H1` -> `H2` -> `H3`). Never skip heading levels.

---

## 5. Automated XML Sitemap

We use `@astrojs/sitemap` to ensure search engines are instantly notified when we add new pages.

### How it Works
During the `npm run build` process, Astro crawls the `src/pages/` directory and generates `dist/sitemap-index.xml` and `dist/sitemap-0.xml`.

### How to Tweak:
*   The sitemap requires an absolute base URL. If the domain ever changes from `tarjuman.org`, you must update the `site` variable in `astro.config.mjs`.
*   Note: You do not need to manually update the sitemap when creating new pages. The integration handles discovery automatically on every build.
