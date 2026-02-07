# Implementation Plan - Tarjuman V3

## Goal
Build a Sworn Translation Service website tailored for Indonesian students applying for Saudi scholarships.
**Value Proposition**: Speed, Trust, Mobile-First.
**Tech Stack**: Astro (SSR), Svelte (Interactive Islands), Tailwind CSS (Design), Supabase (Auth & DB), Cloudflare (Edge Hosting).

## User Review Required
> [!IMPORTANT]
> **Supabase Config**: You will need to add `https://tarjuman.org` and localhost URLs to your Supabase Auth Redirect URLs for Google Login to work.
> **Cloudflare**: Ensure you have the Cloudflare credentials/tokens if we are to deploy from CLI, or we will just build locally and you deploy.

## Proposed Changes

### 1. Project Initialization & Config
#### [NEW] [Project Structure]
- Initialize `Tarjuman-v3` with Astro.
- Integrations:
  - `@astrojs/svelte`: For complex interactive UI.
  - `@astrojs/tailwind`: Basic styling.
  - `shadcn-svelte`: 
    - **What is it?**: Pre-styled components built ON TOP of `bits-ui`.
    - **vs Bits UI**: `bits-ui` is the raw, unstyled logic (headless). `shadcn-svelte` gives us `bits-ui` + "Emerald/Gold" Tailwind styles pre-configured. We want Shadcn to save time on styling.
    - **Astro Strategy**: 
      - **Static (Astro)**: Layouts, Headers, Hero text, simple cards.
      - **Interactive (Svelte/Shadcn)**: Dropzones, Sliders, Dialogs, Toasts. We use `<Component client:load />` only where necessary.
  - `@astrojs/cloudflare`: Adapter for Cloudflare Workers.
- Dependencies:
  - `@supabase/supabase-js`, `@supabase/ssr`: 
    - **Why SSR?**: To handle secure cookies for Auth on the server (Cloudflare).
    - **Usage**: `createServerClient` in Astro pages (for redirecting if not logged in), `createBrowserClient` in Svelte components (for login/upload).
  - `clsx`, `tailwind-merge`: 
    - **Why?**: Essential for Shadcn. 
    - `clsx`: Conditionally apply classes (e.g., `btn-primary` if active, `btn-disabled` if loading).
    - `tailwind-merge`: Resolves conflicts (e.g., `<Button class="p-8" />` overrides default `.p-4` without issues).

### 2. Database Schema Updates (Supabase)
#### [MODIFY] [orders table]
- Add columns:
  - `is_hard_copy` (boolean)
  - `hard_copy_address` (text)
  - `payment_status` (text)
  - `total_amount` (numeric)

#### [NEW] [order_timeline table]
- Track status changes (Submitted -> Verified -> Paid -> Translating -> Draft Ready ...).

### 3. Frontend Implementation
#### [NEW] [Design System]
- `src/styles/global.css`: Define custom fonts (Playfair Display, Inter) and color variables.
- `tailwind.config.mjs`: Configure Emerald Green (#064E3B) and Golden Sand (#D97706).

#### [NEW] [Components (Svelte)]
- `src/components/FileDropzone.svelte`:
  - Drag & drop UI.
  - Page count estimation logic (pdf.js integration).
- `src/components/OrderConfig.svelte`:
  - Speed slider (1-7 days).
  - Hard copy toggle.
  - Real-time price calculator.

#### [NEW] [Pages (Astro)]
- `src/pages/index.astro`: Landing page with Hero and Dropzone.
- `src/pages/login.astro`: Auth gate.
- `src/pages/dashboard/index.astro`: User dashboard with timeline.
- `src/pages/orders/[id].astro`: Order details and review interface.

### 4. Backend Logic (Supabase via Astro Actions/API)
- `src/lib/supabase.ts`: Centralized client.
- `src/pages/api/auth/*`: OAuth handlers.
- `src/actions/index.ts` (if using Astro Actions) or `src/pages/api/orders.ts`: Order creation logic.

## Verification Plan

### Automated Tests
- **Unit Tests**:
  - Test price calculation logic (speed modifier * page count).
  - Test page counting utility.

### Manual Verification
1.  **Flow Test**:
    -   Open Landing Page -> Upload Dummy PDF -> Adjust Slider -> Check Price.
    -   Click "Lanjut" -> Login with Google (Simulated/Real).
    -   Check if Order is created in Supabase `orders` table.
2.  **UI/UX**:
    -   Verify Mobile View (Chrome DevTools).
    -   Check "Emerald Green" aesthetic.
3.  **Deployment**:
    -   Build locally `npm run build`.
    -   Preview `npm run preview`.
