/**
 * Duitku Payment Methods API
 * 
 * Fetches available payment methods for a given amount.
 * Used by the payment page to show method options.
 */
import type { APIRoute } from "astro";
import { createClient } from "../../../lib/supabase";
import { getPaymentMethods } from "../../../lib/duitku";

export const prerender = false;

export const GET: APIRoute = async ({ request, url, cookies, redirect }) => {
    const supabase = createClient({ request, cookies, redirect } as any);

    // 1. Check Auth
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    // 2. Get amount from query param
    const amount = parseInt(url.searchParams.get('amount') || '0', 10);
    if (amount <= 0) {
        return new Response(JSON.stringify({ error: "Valid amount is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    // 3. Fetch payment methods from Duitku
    try {
        const methods = await getPaymentMethods(amount);
        return new Response(JSON.stringify({ methods }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("[payment-methods] FATAL ERROR:", {
            message: err.message,
            stack: err.stack,
            cause: err.cause,
            headers: Object.fromEntries(request.headers),
        });

        // Return detailed error for debugging (remove in prod if needed, but critical now)
        return new Response(JSON.stringify({
            error: err.message || "Failed to fetch payment methods",
            stack: err.stack,
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
