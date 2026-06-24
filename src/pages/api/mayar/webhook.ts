/**
 * Mayar Webhook Endpoint
 *
 * Called by Mayar's server (not the user's browser) when a payment's status
 * changes. Content-Type: application/json.
 *
 * Mayar does not support HMAC request signing or custom webhook headers — the
 * only auth mechanism is a shared token in the `?token=` query parameter of
 * the URL registered with Mayar. The webhook payload itself is therefore
 * untrusted: it is only a fast-path trigger telling us "something changed for
 * invoice/transaction X". We never write payment_status/status based on the
 * payload's own status field — we re-confirm the real status directly from
 * Mayar's API via `confirmAndUpdateOrder`, which is the only code path
 * allowed to write those fields.
 *
 * Auth: invalid/missing token -> 401, no DB access.
 * Everything else, once past the token check, always returns 200 so Mayar
 * doesn't retry pointlessly — the scheduled reconcile job is the real
 * backstop for anything missed here.
 */
import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, MAYAR_WEBHOOK_TOKEN, MAYAR_API_KEY, MAYAR_API_URL } from "astro:env/server";
import { findOrderByInvoiceId, confirmAndUpdateOrder, type MayarConfig } from "../../../lib/mayar";

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
    // 1. Token gate — invalid/missing token must short-circuit before any DB access.
    const token = url.searchParams.get('token');
    if (!token || token !== MAYAR_WEBHOOK_TOKEN) {
        console.error('[Mayar Webhook] Invalid or missing token');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // From here on, always return 200 — Mayar's payload is untrusted and we
    // re-confirm via the API anyway, so there's nothing to gain by signaling
    // failure back to Mayar (it would just retry a payload we either can't
    // read or have already handled as far as we can).
    try {
        let payload: unknown;
        try {
            payload = await request.json();
        } catch (parseErr) {
            console.error('[Mayar Webhook] Failed to parse JSON body:', parseErr);
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        const dataId = (payload as { data?: { id?: unknown } } | null)?.data?.id;
        if (typeof dataId !== 'string' || !dataId) {
            console.error('[Mayar Webhook] Missing or malformed data.id in payload:', payload);
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        if (!SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[Mayar Webhook] SUPABASE_SERVICE_ROLE_KEY is not configured');
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        const adminSupabase = createClient(
            import.meta.env.PUBLIC_SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
        );

        // data.id is not reliably the invoice id in all of Mayar's event
        // payloads — it can be a transaction id. Try invoice id first, then
        // fall back to a direct transaction-id match.
        let order = await findOrderByInvoiceId(adminSupabase, dataId);
        if (!order) {
            const { data, error } = await adminSupabase
                .from('orders')
                .select('*')
                .eq('mayar_transaction_id', dataId)
                .maybeSingle();
            if (error) {
                console.error('[Mayar Webhook] Error finding order by transaction id:', error);
            }
            order = data ?? null;
        }

        if (!order) {
            console.log('[Mayar Webhook] No matching order for data.id:', dataId);
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        if (!MAYAR_API_KEY) {
            console.error('[Mayar Webhook] MAYAR_API_KEY is not configured');
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        const mayarConfig: MayarConfig = {
            apiKey: MAYAR_API_KEY,
            baseUrl: MAYAR_API_URL,
        };

        const result = await confirmAndUpdateOrder(adminSupabase, mayarConfig, order.id);
        console.log('[Mayar Webhook] confirmAndUpdateOrder result for order', order.id, ':', result?.payment_status ?? 'null/error');

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (err) {
        console.error('[Mayar Webhook] Error:', err);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
};
