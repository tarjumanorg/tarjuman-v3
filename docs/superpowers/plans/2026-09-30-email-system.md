# Email System Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SendPulse with Sender.net and rebuild transactional email around shared Indonesian templates, sending each order email exactly once.

**Architecture:** A new `src/lib/email/` module: `sender.ts` (one-POST transport), `templates.ts` (pure, DOM-free templates and layout), `index.ts` (`sendOrderEmail`, `sendOrderEmailById`; never throws). The payment-received email is sent from `src/lib/mayar.ts` at the moment an order transitions to paid, guarded by conditional updates so concurrent paths cannot double-send.

**Tech Stack:** Astro 5 (server output, Cloudflare adapter, `astro:env`), TypeScript, Supabase JS, Sender REST API v2.

**Spec:** `docs/superpowers/specs/2026-09-30-email-system-design.md`

## Global Constraints

- Sender endpoint: `POST https://api.sender.net/v2/message/send`, headers `Authorization: Bearer <key>`, `Content-Type: application/json`, `Accept: application/json`; body `from{email,name}`, `to{email,name}`, `subject`, `html`, `text`; response `{success, message, emailId}`.
- From: `Tarjuman <admin@tarjuman.org>` (domain must be verified in Sender, DNS propagation pending).
- Env var name: `SENDER_API_KEY` (astro:env, `context: "server"`, `access: "secret"`, `optional: true`). The key value is never written to any committed file (only `.env`, which is gitignored, and a Cloudflare secret).
- Copy is Indonesian, formal ("Anda"). Order reference is `'#' + orderId.slice(0, 8).toUpperCase()`. Links use `SITE_URL` (`/orders/{id}` or `/dashboard`).
- Email failures are logged and swallowed; they must never fail an order flow.
- Imports of local TS files omit the `.ts` extension in src code (Astro/TS convention). No `any`.
- Check with `npx astro check` (per CLAUDE.md). No test runner exists; do not add one.
- Do not `git commit` unless the user asks; if asked, stage files by name (never `git add -A`).
- `templates.ts` must have no imports (so it can be run directly by Node for verification).

## Review Focus

- HTML/quote characters in a customer's name (e.g. `<b>"Ann" & Co</b>`): must be escaped in HTML, verbatim in text (pinned in Task 2).
- Null/empty `full_name`: greeting falls back to "Pelanggan" (pinned in Task 2).
- Arabic/RTL names and non-ASCII: HTML declares UTF-8 and passes through unchanged (pinned in Task 2).
- Two paths (webhook, success page, reconcile, admin click) settle the same order at once: exactly one email (guarded by conditional updates in Task 4).
- Sender down, 401/422/429, unverified domain, or `SENDER_API_KEY` missing: `sendEmail` throws, `sendOrderEmail` logs and returns; the calling order flow continues (Tasks 1 and 3).

---

### Task 1: Sender transport and config

**Files:**
- Create: `src/lib/email/sender.ts`
- Modify: `astro.config.mjs:50-53` (env schema), `.env`, `.env.example`

**Interfaces:**
- Produces: `type EmailPayload = { to: string; toName?: string | null; subject: string; html: string; text: string }` and `sendEmail(payload: EmailPayload): Promise<void>` (throws on any failure).

- [ ] **Step 1: Add the env var to the schema**

In `astro.config.mjs`, directly after the `SENDPULSE_SECRET` line add (SendPulse vars are removed in Task 5):

```js
      SENDER_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
```

- [ ] **Step 2: Add the key to `.env` (gitignored) and document it in `.env.example`**

Append to `.env` the line `SENDER_API_KEY=<the API token the user pasted in chat>` (do not echo it back or write it anywhere else). Append to `.env.example`:

```
# Sender.net transactional email
SENDER_API_KEY=your_sender_api_token
```

Run: `git check-ignore .env` → prints `.env` (confirms it is ignored).

- [ ] **Step 3: Verify the token authenticates (read-only call, no email sent)**

Run (Bash; reads the key without printing it):

```bash
KEY=$(grep '^SENDER_API_KEY=' .env | cut -d= -f2-); curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $KEY" -H "Accept: application/json" https://api.sender.net/v2/groups
```

Expected: `200`. `401` means the token is wrong; stop and tell the user.

- [ ] **Step 4: Write `src/lib/email/sender.ts`**

```ts
import { SENDER_API_KEY } from "astro:env/server";

export type EmailPayload = {
    to: string;
    toName?: string | null;
    subject: string;
    html: string;
    text: string;
};

const SENDER_ENDPOINT = "https://api.sender.net/v2/message/send";
const FROM = { email: "admin@tarjuman.org", name: "Tarjuman" };

type SenderResponse = { success?: boolean; message?: string; errors?: unknown };

/**
 * Sends one transactional email through Sender's REST API.
 * Throws on a missing key, a non-2xx status, or `success: false`.
 */
export async function sendEmail({ to, toName, subject, html, text }: EmailPayload): Promise<void> {
    if (!SENDER_API_KEY) {
        throw new Error("SENDER_API_KEY is not configured");
    }

    const res = await fetch(SENDER_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${SENDER_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            from: FROM,
            to: { email: to, name: toName ?? undefined },
            subject,
            html,
            text,
        }),
    });

    const body = (await res.json().catch(() => null)) as SenderResponse | null;
    if (!res.ok || body?.success === false) {
        const detail = body?.errors ? ` ${JSON.stringify(body.errors)}` : "";
        throw new Error(`Sender ${res.status}: ${body?.message ?? res.statusText}${detail}`);
    }
}
```

- [ ] **Step 5: Type-check**

Run: `npx astro check`
Expected: no new errors from `sender.ts` or `astro.config.mjs` (note pre-existing errors, if any, in the output before you started).

---

### Task 2: Templates (pure)

**Files:**
- Create: `src/lib/email/templates.ts`

**Interfaces:**
- Produces:
  - `type EmailKind = "welcome" | "paymentReceived" | "draftReady" | "orderComplete"`
  - `type TemplateData = { name?: string | null; orderRef: string; url: string }`
  - `type EmailContent = { subject: string; html: string; text: string }`
  - `const templates: Record<EmailKind, (data: TemplateData) => EmailContent>`
  - `escapeHtml(value: string): string`

- [ ] **Step 1: Write `src/lib/email/templates.ts`**

```ts
export type EmailKind = "welcome" | "paymentReceived" | "draftReady" | "orderComplete";

export type TemplateData = {
    name?: string | null;
    orderRef: string;
    url: string;
};

export type EmailContent = { subject: string; html: string; text: string };

// Mirrors the light-theme tokens in src/styles/global.css (--primary, --accent).
// Email clients need literal inline values; they cannot read CSS variables.
const PRIMARY = "#064E3B";
const ACCENT = "#E1CA96";

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

type Layout = {
    subject: string;
    heading: string;
    paragraphs: string[];
    cta: { label: string; url: string };
};

const SIGN_OFF = ["Salam hormat,", "Tim Tarjuman"];

function layout({ subject, heading, paragraphs, cta }: Layout): EmailContent {
    const body = paragraphs
        .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;">${escapeHtml(p)}</p>`)
        .join("");

    const html = `<!doctype html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px 16px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
<div style="background:${PRIMARY};padding:20px 24px;color:#ffffff;font-size:20px;font-weight:bold;">Tarjuman</div>
<div style="padding:24px;">
<h1 style="margin:0 0 16px;font-size:22px;color:${PRIMARY};">${escapeHtml(heading)}</h1>
${body}
<p style="margin:24px 0;"><a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:12px 24px;background:${PRIMARY};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;border-bottom:3px solid ${ACCENT};">${escapeHtml(cta.label)}</a></p>
<p style="margin:0;font-size:16px;line-height:1.6;color:#1f2937;">${SIGN_OFF[0]}<br>${SIGN_OFF[1]}</p>
</div>
<div style="padding:16px 24px;background:#fafafa;font-size:12px;color:#6b7280;">Email ini dikirim otomatis oleh Tarjuman (tarjuman.org).</div>
</div>
</body>
</html>`;

    const text = [heading, "", ...paragraphs.flatMap((p) => [p, ""]), `${cta.label}: ${cta.url}`, "", ...SIGN_OFF].join("\n");

    return { subject, html, text };
}

const greeting = (name?: string | null) => `Halo ${name?.trim() || "Pelanggan"},`;

export const templates: Record<EmailKind, (data: TemplateData) => EmailContent> = {
    welcome: ({ name, url }) =>
        layout({
            subject: "Selamat datang di Tarjuman",
            heading: "Selamat datang di Tarjuman",
            paragraphs: [
                greeting(name),
                "Terima kasih telah mendaftar di Tarjuman. Anda dapat mulai dengan meminta penawaran atau mengunggah dokumen melalui dasbor Anda.",
            ],
            cta: { label: "Buka Dasbor", url },
        }),
    paymentReceived: ({ name, orderRef, url }) =>
        layout({
            subject: "Pembayaran diterima, pesanan Anda sedang diproses",
            heading: "Pembayaran diterima",
            paragraphs: [
                greeting(name),
                `Terima kasih, pembayaran Anda untuk pesanan ${orderRef} telah kami terima dan pesanan sedang diproses.`,
                "Kami akan mengabari Anda begitu draf terjemahan siap ditinjau.",
            ],
            cta: { label: "Lihat Pesanan", url },
        }),
    draftReady: ({ name, orderRef, url }) =>
        layout({
            subject: "Draf terjemahan Anda siap ditinjau",
            heading: "Draf siap ditinjau",
            paragraphs: [
                greeting(name),
                `Draf terjemahan untuk pesanan ${orderRef} sudah siap.`,
                "Silakan tinjau di dasbor, lalu setujui atau ajukan revisi.",
            ],
            cta: { label: "Tinjau Draf", url },
        }),
    orderComplete: ({ name, orderRef, url }) =>
        layout({
            subject: "Pesanan terjemahan Anda telah selesai",
            heading: "Pesanan selesai",
            paragraphs: [
                greeting(name),
                `Berkas final untuk pesanan ${orderRef} sudah tersedia.`,
                "Silakan unduh dokumen terjemahan Anda dari dasbor.",
            ],
            cta: { label: "Unduh Dokumen", url },
        }),
};
```

- [ ] **Step 2: Verify the templates against the Review Focus cases (throwaway script, not committed)**

Run from the repo root:

```bash
node --input-type=module -e "
import assert from 'node:assert/strict';
import { templates, escapeHtml } from './src/lib/email/templates.ts';
const url = 'https://tarjuman.org/orders/abc?x=1&y=2';
const evil = '<b>\"Ann\" & Co</b>';
const a = templates.paymentReceived({ name: evil, orderRef: '#1A2B3C4D', url });
assert.ok(!a.html.includes('<b>'), 'raw markup leaked into html');
assert.ok(a.html.includes('&lt;b&gt;&quot;Ann&quot; &amp; Co&lt;/b&gt;'), 'name not escaped');
assert.ok(a.text.includes(evil), 'text part must keep the raw name');
assert.ok(a.html.includes('href=\"https://tarjuman.org/orders/abc?x=1&amp;y=2\"'), 'url not escaped in href');
assert.ok(a.text.includes(url), 'text missing url');
assert.ok(a.html.includes('#1A2B3C4D') && a.subject.length > 0);
assert.ok(templates.welcome({ name: null, orderRef: '', url }).text.includes('Halo Pelanggan,'), 'null name fallback');
assert.ok(templates.draftReady({ name: '   ', orderRef: '#X', url }).text.includes('Halo Pelanggan,'), 'blank name fallback');
const ar = templates.orderComplete({ name: 'محمد', orderRef: '#X', url });
assert.ok(ar.html.includes('<meta charset=\"utf-8\">') && ar.html.includes('محمد') && ar.text.includes('محمد'), 'utf-8 / arabic');
for (const k of Object.keys(templates)) { const t = templates[k]({ name: 'A', orderRef: '#X', url }); assert.ok(t.subject && t.html && t.text, k); }
assert.equal(escapeHtml(\"a'b\"), 'a&#39;b');
console.log('templates OK');
"
```

Expected: `templates OK`. If Node reports it cannot import `.ts`, rerun with `node --experimental-strip-types` before `--input-type=module`.

- [ ] **Step 3: Type-check**

Run: `npx astro check`
Expected: no new errors from `templates.ts`.

---

### Task 3: Email entry points and the three admin/auth call sites

**Files:**
- Create: `src/lib/email/index.ts`
- Modify: `src/pages/api/auth/callback.ts:41-59`, `src/pages/api/admin/upload-draft.ts:51-86`, `src/pages/api/admin/finalize.ts:59-95`

**Interfaces:**
- Consumes: `sendEmail`, `EmailPayload` from `./sender`; `templates`, `EmailKind` from `./templates`.
- Produces:
  - `sendOrderEmail(kind: EmailKind, params: { to: string; name?: string | null; orderId?: string }): Promise<void>` (never throws)
  - `sendOrderEmailById(supabase: SupabaseClient, kind: Exclude<EmailKind, "welcome">, orderId: string): Promise<void>` (never throws; looks up the order's profile email and full_name; no-op with a log if no email)

- [ ] **Step 1: Write `src/lib/email/index.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL } from "astro:env/server";
import { sendEmail } from "./sender";
import { templates, type EmailKind } from "./templates";

type Recipient = { to: string; name?: string | null; orderId?: string };

/**
 * Builds and sends one email. Never throws: an email problem must not fail
 * the order flow that triggered it, so errors are logged and swallowed.
 */
export async function sendOrderEmail(kind: EmailKind, { to, name, orderId }: Recipient): Promise<void> {
    try {
        const orderRef = orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : "";
        const url = `${SITE_URL}${orderId ? `/orders/${orderId}` : "/dashboard"}`;
        await sendEmail({ to, toName: name, ...templates[kind]({ name, orderRef, url }) });
    } catch (e) {
        console.error(`[Email] ${kind} failed`, { orderId }, e);
    }
}

type OrderProfile = { email: string | null; full_name: string | null } | null;

/**
 * Looks up the order's customer and sends the given order email.
 * `supabase` must be able to read `orders` and `profiles` (use the service-role client).
 */
export async function sendOrderEmailById(
    supabase: SupabaseClient,
    kind: Exclude<EmailKind, "welcome">,
    orderId: string,
): Promise<void> {
    const { data, error } = await supabase
        .from("orders")
        .select("id, profiles(email, full_name)")
        .eq("id", orderId)
        .maybeSingle();

    const profile = (data?.profiles ?? null) as unknown as OrderProfile;
    if (error || !profile?.email) {
        console.error(`[Email] ${kind} skipped: no recipient`, { orderId }, error);
        return;
    }
    await sendOrderEmail(kind, { to: profile.email, name: profile.full_name, orderId });
}
```

- [ ] **Step 2: Welcome email in `callback.ts`**

Add at the top: `import { sendOrderEmail } from "../../../lib/email";`

Replace the block from `const userName = ...` through the end of `if (userEmail) { ... }` with:

```ts
                const userName = authData.session.user.user_metadata?.full_name
                    || authData.session.user.email?.split("@")[0];
                const userEmail = authData.session.user.email;

                if (userEmail) {
                    await sendOrderEmail("welcome", { to: userEmail, name: userName });
                }
```

(The old try/catch and dynamic `import("../../../lib/sendpulse")` go away; `sendOrderEmail` handles errors itself. The `|| "User"` fallback is dropped so templates supply "Pelanggan".)

- [ ] **Step 3: Draft-ready email in `upload-draft.ts`**

Add `import { sendOrderEmailById } from "../../../lib/email";`. In the status update, change the select to `.select("id")` (drop the `profiles(...)` join), keep `const { data: updatedOrder, error: updateError }` and the error return, and replace the entire `// Send 'Review' email` try/catch block with:

```ts
    // Send 'Review' email
    await sendOrderEmailById(adminSupabase, "draftReady", orderId);
```

Change the destructure to `const { error: updateError } = await adminSupabase...` (the row data is no longer used) but keep `.single()`, so an update that matches no order still returns the existing 500 error.

- [ ] **Step 4: Complete email in `finalize.ts`**

Same pattern: import `sendOrderEmailById`, change select to `.select("id")`, change the destructure to `const { error: updateError } = ...` (keep `.single()`), replace the `// Send 'Completed' email` try/catch with:

```ts
    // Send 'Completed' email
    await sendOrderEmailById(adminSupabase, "orderComplete", orderId);
```

- [ ] **Step 5: Type-check**

Run: `npx astro check`
Expected: no new errors; `grep -n "sendpulse" src/pages/api/auth/callback.ts src/pages/api/admin/upload-draft.ts src/pages/api/admin/finalize.ts` prints nothing.

---

### Task 4: Send the payment email exactly once

**Files:**
- Modify: `src/lib/mayar.ts` (header note, imports, `confirmAndUpdateOrder` ~lines 162-208, `reconcilePendingOrders` ~lines 254-291), `src/actions/index.ts:1-78`

**Interfaces:**
- Consumes: `sendOrderEmailById(supabase, "paymentReceived", orderId)` from `src/lib/email`.
- Produces: no signature changes. `confirmAndUpdateOrder` keeps returning `Tables<'orders'> | null`; `reconcilePendingOrders` keeps returning `{ checked, settled }` where `settled` now counts only rows this call actually flipped to paid.

- [ ] **Step 1: `mayar.ts` header and import**

Add `import { sendOrderEmailById } from './email';` under the existing imports. In the header comment, replace the paragraph starting "Design note: env vars (apiKey/baseUrl) are passed in via `MayarConfig`..." with:

```
 * Design note: env vars (apiKey/baseUrl) are passed in via `MayarConfig`
 * rather than read directly from `astro:env/server` in this module. The one
 * exception is the payment-received email, which is sent from here (via
 * `./email`) at the moment an order flips to paid, so it fires exactly once
 * no matter which caller (webhook, success page, pay route, reconcile) wins.
 * This module is server-only.
```

- [ ] **Step 2: Conditional update + send in `confirmAndUpdateOrder`**

Replace the update block (from `const { data: updated, error: updateError } = await adminSupabase` to `return updated;`) with:

```ts
    const { data: updated, error: updateError } = await adminSupabase
        .from('orders')
        .update({
            payment_status: nextStatus,
            status: nextStatus === 'paid' ? 'processing' : order.status,
            mayar_transaction_id: detail.transactionId ?? order.mayar_transaction_id,
        })
        .eq('id', orderId)
        .in('payment_status', ['unpaid', 'pending'])
        .select()
        .maybeSingle();

    if (updateError) {
        console.error('Error updating order payment status:', updateError);
        return order;
    }
    // No row means another path already settled this order; it sent the email.
    if (!updated) return order;

    if (nextStatus === 'paid') {
        await sendOrderEmailById(adminSupabase, 'paymentReceived', orderId);
    }
    return updated;
```

- [ ] **Step 3: Conditional update + send in `reconcilePendingOrders`**

Replace the loop body's update (from `const { error: updateError } = await adminSupabase` through `settled++;`) with:

```ts
        const { data: settledRows, error: updateError } = await adminSupabase
            .from('orders')
            .update({ payment_status: 'paid', status: 'processing' })
            .eq('id', row.id)
            .in('payment_status', ['unpaid', 'pending'])
            .select('id');
        if (updateError) {
            console.error('Error marking order paid during reconciliation:', updateError);
            continue;
        }
        if (!settledRows?.length) continue; // another path settled it first
        await sendOrderEmailById(adminSupabase, 'paymentReceived', row.id);
        settled++;
```

- [ ] **Step 4: `confirmPayment` in `src/actions/index.ts`**

Remove `import { sendEmail } from '../lib/sendpulse';` and add `import { sendOrderEmailById } from '../lib/email';`. Replace the update, its error check, and the email try/catch (everything from `const { data: updatedOrder, error: updateError } = await adminSupabase` to just before `return { success: true };`) with:

```ts
            // Only flip orders that are not already paid, so a Mayar-settled order
            // is not reset to 'processing' and the customer is not emailed twice.
            const { data: updatedOrder, error: updateError } = await adminSupabase
                .from("orders")
                .update({
                    payment_status: 'paid',
                    status: 'processing',
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId)
                .or('payment_status.is.null,payment_status.neq.paid')
                .select('id')
                .maybeSingle();

            if (updateError) throw new Error("Failed to update order status");

            if (updatedOrder) {
                await sendOrderEmailById(adminSupabase, 'paymentReceived', orderId);
            }
```

(Keep the existing `return { success: true };`; an already-paid order is a successful no-op.)

- [ ] **Step 5: Type-check and read the guard**

Run: `npx astro check` → no new errors.
Confirm by reading that each of the three paid transitions has a conditional `WHERE` and sends only on a returned row. Under Postgres READ COMMITTED a second concurrent `UPDATE ... WHERE payment_status IN (...)` re-evaluates the WHERE after the first commits and matches zero rows, which is what guarantees a single email.

---

### Task 5: Remove SendPulse and the open test endpoint

**Files:**
- Delete: `src/lib/sendpulse.ts`, `src/pages/api/admin/test-email.ts`
- Modify: `astro.config.mjs:50-53`, `.env`

- [ ] **Step 1: Delete the files**

Run: `Remove-Item src/lib/sendpulse.ts, src/pages/api/admin/test-email.ts` (PowerShell) — confirm neither is imported first: `grep -rn "sendpulse\|test-email" src` should show only these two files.

- [ ] **Step 2: Remove the four `SENDPULSE_*` lines from the env schema in `astro.config.mjs` and from `.env`** (the two `SENDPULSE_API_*` entries there). Tell the user to delete the `SENDPULSE_*` secrets in the Cloudflare dashboard and add `SENDER_API_KEY` there.

- [ ] **Step 3: Final checks**

Run: `grep -rni "sendpulse" src astro.config.mjs .env.example` → no output.
Run: `npx astro check` → no new errors versus baseline.
Run: `npm run build` → completes.

- [ ] **Step 4: Real test send (blocked until Sender shows tarjuman.org as verified)**

Once verified, with `npm run dev` running, from a scratch script or the browser trigger any one email (e.g. sign up a test account for the welcome email) and confirm it arrives in the inbox with a working button link and the plain-text part. Until then report this step as NOT done.
