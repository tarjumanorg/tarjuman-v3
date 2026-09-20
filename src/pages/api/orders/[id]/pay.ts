
import type { APIRoute } from "astro";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../../../../lib/supabase";
import { createOrderInvoice, confirmAndUpdateOrder } from "../../../../lib/mayar";
import { SITE_URL, MAYAR_API_KEY, MAYAR_API_URL, SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";

export const prerender = false;

export const POST: APIRoute = async ({ request, params, cookies, redirect }) => {
    const { id } = params;
    const supabase = createClient({ request, cookies, redirect } as any);

    if (!id) {
        return new Response(JSON.stringify({ error: "Order ID is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

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

    // 2. Fetch order with user profile
    const { data: order, error } = await supabase
        .from("orders")
        .select("*, profiles!fk_orders_profiles(full_name, email, whatsapp_number)")
        .eq("id", id)
        .single();

    if (!order || error) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Security: Ensure user owns the order
    if (order.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Ensure order is in a payable state
    if (order.payment_status === 'paid') {
        return new Response(JSON.stringify({ error: "Order is already paid" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const paymentAmount = Math.round(order.final_price || 0);
    if (paymentAmount <= 0) {
        return new Response(JSON.stringify({ error: "Order has no valid price" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    // 3. Request invoice from Mayar
    // Note: Cloudflare intercepts and replaces the response body for 500/502/504
    // (and 520-526) with its own HTML error page, even when the Worker/Pages
    // Function explicitly set a JSON body — confirmed empirically in production.
    // Every error response here must stay outside that range so the client's
    // `response.json()` doesn't throw on Cloudflare's HTML instead of our JSON.
    if (!MAYAR_API_KEY) {
        console.error("MAYAR_API_KEY is not configured");
        return new Response(JSON.stringify({ error: "Payment request failed" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.error("SUPABASE_SERVICE_ROLE_KEY is not configured");
        return new Response(JSON.stringify({ error: "Payment request failed" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }
    const adminSupabase = createSupabaseClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
    );

    try {
        // If the stored invoice was already paid, settle the order instead of issuing a new invoice.
        const confirmed = await confirmAndUpdateOrder(
            adminSupabase,
            { apiKey: MAYAR_API_KEY, baseUrl: MAYAR_API_URL },
            id,
        );
        if (confirmed?.payment_status === 'paid') {
            return new Response(JSON.stringify({ error: "Order is already paid" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const profile = order.profiles as any;
        const customerName = profile?.full_name || user.email?.split('@')[0] || 'Customer';
        const customerEmail = profile?.email || user.email || '';
        const customerPhone = profile?.whatsapp_number || '';

        const result = await createOrderInvoice(
            adminSupabase,
            { apiKey: MAYAR_API_KEY, baseUrl: MAYAR_API_URL },
            {
                orderId: id,
                amount: paymentAmount,
                name: customerName,
                email: customerEmail,
                mobile: customerPhone,
                description: `Jasa Terjemah Tersumpah - Tarjuman (Order #${id.slice(0, 8)})`,
                redirectUrl: `${SITE_URL}/payment/success/${id}`,
            }
        );

        if (!result) {
            return new Response(JSON.stringify({ error: "Payment request failed" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({
            paymentUrl: result.link,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("Mayar invoice request failed:", err);
        return new Response(JSON.stringify({ error: err.message || "Payment request failed" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }
};
