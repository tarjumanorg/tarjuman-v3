---
trigger: always_on
---

# Project Perspective & Rules

This project is a modern, production-grade application leveraging the latest web technologies. Follow these rules strictly to maintain consistency, reliability, and performance.

## Core Tech Stack
- **Astro 5.18+**: SSR-first architecture with `output: 'server'`.
- **Svelte 5.53+**: Used exclusively for interactive islands.
- **Tailwind 4.2+**: CSS-variable-driven styling system.
- **Supabase SSR**: Robust authentication and data access.
- **Typescript 5.9+**: Strict typing across the codebase.

## Architectural Patterns

### 1. Astro First, Svelte Second
- Use Astro components (`.astro`) for static and server-rendered content.
- Use Svelte components (`.svelte`) ONLY when client-side interaction is required.
- Pass data from Astro to Svelte via props to minimize client-side fetching.

### 2. Svelte 5 Runes (Mandatory)
- DO NOT use legacy Svelte 4 syntax (e.g., `let count = 0;` for state).
- **Mandatory Runes**:
  - `$state()` for reactive variables.
  - `$derived()` for computed state.
  - `$props()` for component inputs.
  - `$effect()` for side effects (use sparingly).
- Use `onclick={handler}` instead of the legacy `on:click`.

### 3. Shadcn Svelte & Styling
- **Philosophy**: Use `shadcn-svelte` for reusable UI components. Only use Tailwind 4 directly for layouts and ad-hoc styling that isn't provided by a component.
- **Location**: Components are located in `src/lib/components/ui`.
- **Customization**: Components in the `ui` folder are owned by the project. Customize them directly to match the design system rather than creating wrappers.
- **Installation**: Use `npx shadcn-svelte@latest add <component>` to add new components.
- **Usage**:
  - Use staggered/namespace imports: `import * as Tooltip from "$lib/components/ui/tooltip"`.
  - Ensure all components are updated to **Svelte 5 Runes**.
- **Theme Configuration**: All theme modifications (colors, radii, etc.) MUST be done in `src/styles/global.css` using `@theme inline`.
- **Design Tokens**: Prefer CSS variables (`var(--primary)`, etc.) over hardcoded OKLCH/Hex values.
- **Icons**: Use `@lucide/svelte`.

### 4. Supabase SSR & Data Access
- **Client Creation**: Use the `createClient` helper from `$lib/supabase`. 
  - **Server-side (Astro)**: Pass the `APIContext` (e.g., `createClient(context)` or `createClient(Astro)`).
  - **Client-side (Svelte)**: Call without arguments (`createClient()`).
- **Middleware Usage**: Use `locals.supabase` and `locals.user` in Astro components. The `auth.getUser()` call in `src/middleware.ts` is mandatory for session refresh and security.
- **Security**: ALWAYS use `supabase.auth.getUser()` for authentication and authorization checks. DO NOT rely on `getSession()`, as its data can be spoofed.
- **Type Safety**: Always use the generated `Database` types from `src/types/supabase.ts`. The `createClient` helper already incorporates this by default.
- **Protected Routes**: Middleware automatically handles RBAC for `/admin` (requires `admin` role in `profiles` table) and `/dashboard` (requires authentication).
* **Astro Actions**: Use Actions as the **default** for all internal state changes (POST/PATCH/DELETE).
* **Context**: Always pass the Action `context` to `createClient(context)` to ensure the Supabase session is inherited correctly.
* **Validation**: Every action **must** define an `input` schema using Zod. Fail-fast at the edge.
* **Type Safety**: Leverage the auto-generated `ActionReturnType` when handling results in Svelte 5 components to ensure `$state` updates are type-safe.
- **Data Flow**: Pass data from Astro to Svelte 5 components via `$props()`. Avoid client-side fetching in Svelte components unless it's strictly for user-triggered interactions.
- **Migrations**: Always create migration files in `supabase/migrations` before applying DDL changes.
- **Performance**: Enable and leverage **Astro 5 Prefetching** (via `prefetch` configuration set to `intent`) to make navigation feel instantaneous using the Speculation Rules API.

### 5. DRY & Utilities
- Check `src/lib/utils.ts` before creating new formatters or helpers.

### New Section 6: Communication Patterns (Actions vs. API)

To maintain architectural cleanlines, follow this decision tree for server communication:

#### 1. Use Astro Actions When:

* The request is triggered by a **User Interaction** within the app (e.g., clicking "Save," "Submit," or "Toggle").
* You are performing a **Data Mutation** (changing something in Supabase).
* You need **End-to-End Type Safety** between the server logic and a Svelte component.
* You want to leverage **Progressive Enhancement** for forms.

#### 2. Use API Routes (`src/pages/api/...`) When:

* The consumer is **External** (e.g., a mobile app, a cron job, or a third-party webhook like Stripe).
* You need to serve **Non-JSON content** (e.g., generating a Sitemap, RSS feed, or dynamic OG image).
* You are implementing a strictly **GET-based** resource that needs to be linkable/cacheable by a browser or CDN.
* The endpoint requires **Custom HTTP Headers** or specific status code control that goes beyond the standard Action response.

## Commands & Tooling
- **Type Checking**: `npx astro check`.
- **Development**: `npm run dev`.
- **Always use `supabase-tarjuman` MCP tools** for database operations. the project is `uanunxlglzahnpyytrpa`.