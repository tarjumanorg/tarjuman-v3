# Mayar → Midtrans Payment Migration — Design

Status: approved by user, pending implementation plan
Date: 2026-09-12

## Context

Tarjuman-v3 (Astro + Svelte islands, deployed to Cloudflare Pages via
`@astrojs/cloudflare`, Supabase for auth/DB/storage) currently uses Mayar as
its payment gateway. This is Tarjuman's third payment-provider generation:
manual bank transfer → Duitku → Mayar (current). We are migrating to
Midtrans, using the Snap popup/embed product, with a full cutover (no
parallel-run period).

Reference credentials: the sandbox Midtrans merchant account already used by
the sibling project `studyinsaudi-web`
(`C:\Users\fulan\Documents\Projects\studyinsaudi-web`), which integrates
Midtrans Snap + Core API via a hand-rolled `fetch` client (no
`midtrans-client` npm package, because that package depends on
axios/lodash, which are unreliable on Cloudflare Workers — a constraint that
applies equally to Tarjuman-v3 since it deploys to the same runtime).

## Current state (Mayar), for reference

- `src/lib/mayar.ts` — API client (`createOrderInvoice`, `getInvoiceStatus`,
  `confirmAndUpdateOrder`, `findOrderByInvoiceId`, `reconcilePendingOrders`).
- `src/pages/api/mayar/webhook.ts` — webhook receiver, auth via `?token=`
  query param (Mayar has no HMAC/signature scheme). Payload treated as
  untrusted; only used to look up the order, then `confirmAndUpdateOrder`
  re-fetches real status from Mayar's API.
- `src/pages/api/mayar/reconcile.ts` — bearer-token-authed sweep endpoint,
  called by a standalone Cloudflare Worker cron (`workers/mayar-reconcile-cron/`,
  `*/10 * * * *`) because `@astrojs/cloudflare` only exports a `fetch`
  handler, not `scheduled`.
- `src/pages/api/orders/[id]/pay.ts` — checkout initiation; calls
  `createOrderInvoice`, returns `{ paymentUrl }`, browser does
  `window.location.href = paymentUrl` (full-page redirect to Mayar's hosted
  page).
- `src/pages/payment/[id].astro` / `src/pages/payment/success/[id].astro` —
  pre-payment (phone number collection + redirect) and post-payment
  (re-confirms status server-side on load) pages.
- `src/pages/admin/orders/[id].astro` + `src/actions/index.ts`
  (`confirmPayment`) — admin manual override, bypasses the gateway entirely
  by writing `payment_status`/`status` directly. Provider-agnostic; no
  changes needed.
- No `payments`/`transactions` table exists — payment state lives directly
  on `orders`: `mayar_invoice_id`, `mayar_transaction_id`,
  `mayar_payment_url` (all `text`, nullable), plus a stale `payment_method`
  column (comment says "Duitku payment method code", unused by current
  Mayar code).
- Env vars: `MAYAR_API_KEY`, `MAYAR_API_URL`, `MAYAR_WEBHOOK_TOKEN`,
  `SITE_URL`.
- Known quirk relied on throughout: Cloudflare replaces response bodies for
  5xx-adjacent status codes (500/502/504/520-526) with its own HTML error
  page, even when the Function sets a JSON body. All error responses in
  payment routes intentionally use non-5xx codes (400/401) so
  `response.json()` on the caller side never chokes on HTML.
- `astro.config.mjs` sets `security.checkOrigin: false` globally, because
  the Mayar webhook is an external POST that Astro's origin check would
  otherwise reject.
- No CSP is configured anywhere in this project (no `_headers`, no
  middleware) — confirmed by search, unlike studyinsaudi-web which had to
  allowlist Midtrans's hosts.
- A worktree at `.claude/worktrees/mayar-payment-migration`
  (branch `hotfix/mayar-pay-bugs`) is confirmed clean and already merged
  into `main` via PR #16 — safe to remove, not in-progress work.
- `.mcp.json` has a `mayar` MCP server entry with a live bearer JWT inlined
  directly in the file (not templated to an env var) — a pre-existing
  credential-hygiene issue, unrelated to which payment gateway is
  integrated, but being cleaned up as part of removing the `mayar` entry.

## Target architecture (Midtrans)

### Data model

Migration applied directly against the live Supabase project (per this
project's own convention: the `supabase/migrations/` folder is not
authoritative, only one legacy file exists there — use
`mcp__supabase__apply_migration` and re-check via `mcp__supabase__list_tables`,
not the migrations folder):

- Drop `mayar_invoice_id`, `mayar_payment_url` — no Midtrans equivalent is
  persisted (see below).
- Rename `mayar_transaction_id` → `midtrans_transaction_id`.
- Add `midtrans_order_id text` — the order_id **we** generate and send to
  Midtrans: `'trj-' || orders.id`. Deterministic and namespaced with a
  `trj-` prefix because the Midtrans server key is shared with
  studyinsaudi-web's merchant account, and Midtrans requires order_id
  uniqueness per merchant account, not per app.
- Repurpose `payment_method` (update its column comment) to store
  Midtrans's `payment_type` (e.g. `qris`, `bank_transfer`, `gopay`) once a
  transaction settles.
- No Snap `token` or `redirect_url` is persisted — both are short-lived and
  consumed immediately client-side.

Regenerate `src/types/supabase.ts` via
`mcp__supabase__generate_typescript_types` after the migration, so any
missed `mayar_*` reference becomes a compile error.

### Payment library — `src/lib/midtrans.ts` (replaces `src/lib/mayar.ts`)

Same shape as today's `mayar.ts`: config (`serverKey`, `clientKey`,
`isProduction`) passed in via a `MidtransConfig` param, not read directly
from `astro:env/server`, so the module stays safe to import from contexts
without server-only env access. Direct `fetch` calls, no SDK.

- `snapBaseUrl()` / `coreApiBaseUrl()` — switch on `isProduction`:
  `app.sandbox.midtrans.com` / `app.midtrans.com` (Snap),
  `api.sandbox.midtrans.com` / `api.midtrans.com` (Core API).
- `createSnapTransaction(adminSupabase, config, params)` — `POST
  {snapBaseUrl}/snap/v1/transactions`, `Authorization: Basic
  base64(serverKey + ':')`. Body: `transaction_details` (`order_id`,
  `gross_amount`), `customer_details`, `item_details`. On first call for an
  order, writes `midtrans_order_id` onto the `orders` row; on retry
  (order still `unpaid`/`pending`), reuses the existing stored
  `midtrans_order_id` rather than minting a new one, and just requests a
  fresh token for it. Returns `{ token }`.
- `getTransactionStatus(config, orderId)` — `GET
  {coreApiBaseUrl}/v2/{order_id}/status`. The canonical source of truth —
  never trust a webhook payload's own status field.
- `mapTransactionStatus(transactionStatus, fraudStatus)` — `capture` /
  `settlement` (with `fraud_status: accept` when present) → `paid`;
  `deny`/`cancel`/`expire`/`failure` → `failed`; `pending` → `pending`;
  `refund`/`partial_refund`/`chargeback` → `failed` (no refund UI exists;
  these need manual admin follow-up either way, same as today).
- `verifyNotificationSignature(config, { orderId, statusCode, grossAmount,
  signatureKey })` — recomputes `SHA512(order_id + status_code +
  gross_amount + serverKey)` and compares against `signatureKey` with a
  constant-time compare (not `===`). `grossAmount` must be used exactly as
  the string Midtrans sent in the notification body (e.g. `"299000.00"`),
  never reformatted/re-serialized as a number first — studyinsaudi-web's
  own code comments flag this as the most common Snap signature bug.
- `confirmAndUpdateOrder(adminSupabase, config, orderId)` — same idempotent
  shape as today's function of the same name: only orders still
  `unpaid`/`pending` with a `midtrans_order_id` get checked; calls
  `getTransactionStatus`, writes `payment_status` / `status` /
  `midtrans_transaction_id` / `payment_method` (repurposed for
  `payment_type`) — this is the single code path allowed to write those
  fields, exactly as today.
- `findOrderByMidtransOrderId(adminSupabase, orderId)` — single lookup,
  replacing today's invoice-id-then-transaction-id fallback (unnecessary
  now that order_id is ours from the start, not assigned by the gateway).
- `reconcilePendingOrders(adminSupabase, config)` — same sweep shape as
  today (`payment_status in (unpaid, pending)`, `midtrans_order_id not
  null`, `created_at` older than 60s, cap 200), but per-order
  `getTransactionStatus` calls instead of Mayar's paginated bulk
  paid-invoice list (Midtrans has no such bulk endpoint) — net simpler,
  no pagination loop.

### Checkout flow (Snap popup/embed)

- `src/pages/api/orders/[id]/pay.ts` — same auth/ownership/already-paid
  guards as today; calls `createSnapTransaction` instead of
  `createOrderInvoice`; returns `{ token }` instead of `{ paymentUrl }`.
  Same non-5xx-error-code convention preserved (Cloudflare HTML-body
  interception workaround).
- `src/pages/payment/[id].astro` — add `snap.js` via a plain `<script>`
  tag, `src` chosen server-side from `MIDTRANS_IS_PRODUCTION`
  (`https://app.sandbox.midtrans.com/snap/snap.js` or
  `https://app.midtrans.com/snap/snap.js`), `data-client-key=
  {MIDTRANS_CLIENT_KEY}`. No CSP changes needed (none configured in this
  project). The existing `startPayment()` client script swaps
  `window.location.href = data.paymentUrl` for `window.snap.pay(data.token,
  { onSuccess, onPending, onError, onClose })`; `onSuccess`/`onPending`/
  `onError` all navigate to `/payment/success/[id]` (which already
  re-confirms via `confirmAndUpdateOrder` on load — just swap the import
  from `mayar` to `midtrans`); `onClose` re-shows the retry UI instead,
  since the user may not have completed payment yet.

### Webhook — `src/pages/api/midtrans/webhook.ts` (replaces `/api/mayar/webhook.ts`)

- `POST`, `prerender = false`. Parse JSON body for `order_id`,
  `status_code`, `gross_amount`, `signature_key`. Malformed → `200
  {ok:true}` immediately (nothing to act on).
- Verify `signature_key` via `verifyNotificationSignature` — invalid → 401,
  no DB access. This is a real upgrade over Mayar's shared-secret-in-query
  design (which the current code comments explicitly flag as having no
  HMAC/signing support at all).
- Look up the order via `findOrderByMidtransOrderId`. No match → 200
  `{ok:true, skipped:true}`.
- Call `confirmAndUpdateOrder` (re-fetches real status from Core API,
  never trusts the webhook body's own `transaction_status` — same
  defense-in-depth pattern as today and as studyinsaudi-web's
  `routes.ts:294-296`). Always returns 200 after the signature check
  passes.
- `astro.config.mjs`'s `security.checkOrigin: false` stays (still needed
  for this external POST) — just update the comment to say Midtrans.

### Reconciliation backstop — kept, not dropped

Decision (discussed explicitly, not just carried over by default): keep
the reconciliation cron. Rationale:
- Many Indonesian payment methods (bank transfer/VA, QRIS,
  Indomaret/Alfamart) settle *after* the customer leaves the Snap popup —
  they get a VA number or QR code, close the tab, and pay later from their
  banking app. The webhook is the only path to that update; there's no
  "customer returns to the success page" moment to piggyback a re-confirm
  on.
- The webhook handler always returns 200 even on internal failure (house
  convention, so Midtrans doesn't retry payloads we can't process) — so a
  transient bug or Supabase hiccup during the webhook call would never get
  retried by Midtrans's own backoff, since we told it "all good" regardless.
- Order volume is tiny (6 rows in the live `orders` table at design time),
  so the cron's cost is negligible either way.

What does improve over Mayar: Midtrans's own webhook retry policy (2 min–
3.5 hr backoff on non-2xx) is far more robust than Mayar's (which has
none), and signature verification makes the webhook itself trustworthy —
so the backstop becomes a true rare-case safety net. Same 10-minute
cadence as today, no tuning needed.

- `src/pages/api/midtrans/reconcile.ts` (replaces `/api/mayar/reconcile.ts`)
  — same bearer-token auth, renamed `MIDTRANS_WEBHOOK_TOKEN` (an internal
  secret we invent for auth between our cron worker and this endpoint, not
  something Midtrans issues — free to rename). Same real-error-status
  convention (400 on misconfig; this caller is internal, not Midtrans).
  Calls `reconcilePendingOrders`.
- `workers/mayar-reconcile-cron/` → `workers/midtrans-reconcile-cron/`,
  same `scheduled()` shape, `RECONCILE_URL` →
  `https://tarjuman.org/api/midtrans/reconcile`, env var renamed to
  `MIDTRANS_WEBHOOK_TOKEN`. Same architecture reason as today: the
  Cloudflare adapter only exports `fetch`, not `scheduled`.

### Admin UI

`src/pages/admin/orders/[id].astro`:
- "Menunggu Pembayaran" panel: `order.mayar_invoice_id` →
  `order.midtrans_order_id`; copy "Mayar mengonfirmasi pembayaran" →
  "Midtrans mengonfirmasi pembayaran".
- Payment success page "Referensi" row: `confirmedOrder.mayar_transaction_id`
  → `confirmedOrder.midtrans_transaction_id`.
- Manual "Konfirmasi Manual & Mulai Kerjakan" override
  (`src/actions/index.ts` `confirmPayment`) is already provider-agnostic —
  no changes.

### Cleanup (full cutover)

- Delete `src/lib/mayar.ts`, `src/pages/api/mayar/webhook.ts`,
  `src/pages/api/mayar/reconcile.ts`.
- Delete the `.claude/worktrees/mayar-payment-migration` worktree and its
  branch `hotfix/mayar-pay-bugs` (confirmed clean, fully merged into
  `main` via PR #16 — verified via `git status` and `git log` before
  deletion, not assumed).
- Remove the `mayar` entry from `.mcp.json`; also rotate/remove the live
  bearer JWT inlined in that file (pre-existing credential-hygiene issue,
  flagged to the user before touching it, not fixed silently as a
  drive-by).

### Env vars

`.env.example` and `astro.config.mjs`'s `env.schema`:
- Remove `MAYAR_API_KEY`, `MAYAR_API_URL`.
- `MAYAR_WEBHOOK_TOKEN` → `MIDTRANS_WEBHOOK_TOKEN`.
- Add `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`
  (default `"false"` — starts on studyinsaudi-web's sandbox credentials).
- `SITE_URL` stays (still used elsewhere; Snap popup mode doesn't need a
  server-side `redirectUrl` param the way Mayar's hosted invoice did —
  `callbacks` are client-side JS).

## Rollout / testing plan

1. Sandbox first: wire up with studyinsaudi-web's sandbox
   `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY`,
   `MIDTRANS_IS_PRODUCTION=false`. Exercise the full loop — checkout →
   Snap popup → simulate settlement via Midtrans's sandbox simulator →
   webhook fires → order flips to `paid`/`processing`. Also test
   `onPending` (simulated VA) and confirm the reconcile endpoint later
   picks it up once settled.
2. Unit test `verifyNotificationSignature` against fixtures: valid
   signature accepts; tampered `gross_amount`/`order_id` rejects. This is
   the one piece of new crypto logic worth pinning down directly rather
   than only exercising it via integration testing.
3. `npx astro check` after the Supabase migration + regenerated types, to
   catch any missed `mayar_*` reference as a compile error.
4. Go-live: once Tarjuman has its own Midtrans merchant
   registration/production keys, swap `MIDTRANS_IS_PRODUCTION=true` and
   the production server/client keys in Cloudflare Pages project settings
   and the cron worker's `wrangler secret put` — no code change required.

## Explicitly out of scope

- Refund handling: no refund UI or columns exist today; stays a
  manual/support-side process, unchanged by this migration.
- Any change to the manual admin "Konfirmasi Manual" override's behavior.
- Populating `order_timeline` (exists, currently unused/empty) — not
  requested, not required by this migration.
