# Email system rebuild (SendPulse to Sender)

## Goal
Replace SendPulse with Sender.net and rebuild transactional email around shared templates: Indonesian copy, links to the order/dashboard, escaped user input, real plain-text parts, and a payment-received email for Mayar payments (currently only sent on the admin confirm click).

## Non-goals
Bounce/unsubscribe webhooks, subscriber sync, marketing campaigns, a test runner, English copy.

## Structure (`src/lib/email/`)
- `sender.ts`: `sendEmail({ to, toName, subject, html, text })`. One POST to `https://api.sender.net/v2/message/send`, headers `Authorization: Bearer`, `Content-Type` and `Accept: application/json`. Body: `from {email, name}`, `to {email, name}`, `subject`, `html`, `text`. Throws when the HTTP status is not ok or the response has `success: false`. From: `Tarjuman <admin@tarjuman.org>`.
- `templates.ts`: `escapeHtml`, one `layout({ heading, paragraphs, cta })` returning HTML plus derived plain text, and four templates (`welcome`, `paymentReceived`, `draftReady`, `orderComplete`) each returning `{ subject, html, text }` from `{ name, orderRef, url }`. Inline styles (email clients require it).
- `index.ts`: `sendOrderEmail(kind, { to, name, orderId? })`. Builds URL from `SITE_URL` (`/orders/{id}` or `/dashboard`), `orderRef = '#' + id.slice(0, 8).toUpperCase()`. Catches and logs errors (never throws to the caller). Callers await it.

## Config
- Add `SENDER_API_KEY` (server, secret, optional) to `astro.config.mjs`; set in `.env` and as a Cloudflare secret.
- Remove the four `SENDPULSE_*` vars and delete `src/lib/sendpulse.ts`.

## Call sites
- `api/auth/callback.ts` (welcome), `api/admin/upload-draft.ts` (draftReady), `api/admin/finalize.ts` (orderComplete), `actions/index.ts` `confirmPayment` (paymentReceived): replace inline HTML with `sendOrderEmail`.
- Payment email must fire exactly once per order. `confirmAndUpdateOrder` has four callers (Mayar webhook, `api/orders/[id]/pay.ts`, `payment/success/[id].astro`, plus `reconcilePendingOrders` via the reconcile route), and whichever settles the order first wins, so the send lives inside `src/lib/mayar.ts` at the transition itself (not in a caller-supplied callback, which a caller could forget). Make the paid transition conditional (`.in('payment_status', ['unpaid','pending'])`) in `confirmAndUpdateOrder` and `reconcilePendingOrders`, and in `confirmPayment` (`payment_status` null or not `'paid'`); send only when the update returned a row. `mayar.ts` therefore imports `sendOrderEmailById` from `src/lib/email`; its header note about env-free imports is updated.
- `index.ts` also exports `sendOrderEmailById(supabase, kind, orderId)`, which looks up the order's profile (email, full_name) and sends; all four order emails use it, so call sites are one line and no longer select `profiles` themselves.
- Delete `src/pages/api/admin/test-email.ts` (unauthenticated, leaks stack traces).

## Failure handling
Send errors are logged with context (`[Email] kind, orderId, error`) and swallowed; order flows must not fail on email. Cloudflare observability is enabled.

## Verification
`npx astro check`; grep for leftover `sendpulse`/`SENDPULSE`; one real test send after `tarjuman.org` (SPF/DKIM/DMARC) is verified in Sender (DNS propagation pending at time of writing).
