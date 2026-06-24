/**
 * Mayar Reconcile Endpoint
 *
 * Sweeps all pending orders against Mayar's paid-invoice listing and settles
 * any that the webhook missed. This is the real source of truth for payment
 * status — the webhook is only a fast-path trigger. A Cloudflare Cron worker
 * calls this endpoint on a schedule.
 *
 * Auth: shared bearer token (same secret as the webhook). Invalid/missing
 * token -> 401, no DB/Mayar access. Unlike the webhook, this endpoint is
 * triggered by us, not by Mayar, so internal failures return real error
 * statuses (500) rather than always-200 — callers like the cron worker can
 * alert on them.
 */
import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, MAYAR_WEBHOOK_TOKEN, MAYAR_API_KEY, MAYAR_API_URL } from "astro:env/server";
import { reconcilePendingOrders, type MayarConfig } from "../../../lib/mayar";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    // 1. Auth gate — invalid/missing token must short-circuit before any DB/Mayar access.
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${MAYAR_WEBHOOK_TOKEN}`) {
        console.error('[Mayar Reconcile] Invalid or missing Authorization header');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        if (!SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[Mayar Reconcile] SUPABASE_SERVICE_ROLE_KEY is not configured');
            return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const adminSupabase = createClient(
            import.meta.env.PUBLIC_SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
        );

        if (!MAYAR_API_KEY) {
            console.error('[Mayar Reconcile] MAYAR_API_KEY is not configured');
            return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const mayarConfig: MayarConfig = {
            apiKey: MAYAR_API_KEY,
            baseUrl: MAYAR_API_URL,
        };

        const result = await reconcilePendingOrders(adminSupabase, mayarConfig);

        return new Response(JSON.stringify({ ok: true, checked: result.checked, settled: result.settled }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[Mayar Reconcile] Error:', err);
        return new Response(JSON.stringify({ error: 'Internal error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
