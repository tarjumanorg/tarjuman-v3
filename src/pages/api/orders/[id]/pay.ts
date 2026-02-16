
import type { APIRoute } from "astro";
import { createClient } from "../../../../lib/supabase";
import { requestTransaction } from "../../../../lib/duitku";

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

    // 2. Parse body for payment method
    let body: { paymentMethod: string };
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (!body.paymentMethod) {
        return new Response(JSON.stringify({ error: "paymentMethod is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    // 3. Fetch order with user profile
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

    // 4. Request transaction from Duitku
    try {
        const profile = order.profiles as any;
        const customerName = profile?.full_name || user.email?.split('@')[0] || 'Customer';
        const customerEmail = profile?.email || user.email || '';
        const customerPhone = profile?.whatsapp_number || '';

        const result = await requestTransaction({
            orderId: id,
            paymentAmount,
            paymentMethod: body.paymentMethod,
            productDetails: `Jasa Terjemah Tersumpah - Tarjuman (Order #${id.slice(0, 8)})`,
            email: customerEmail,
            customerName,
            phoneNumber: customerPhone,
        });

        // 5. Store Duitku reference on the order
        const { error: updateError } = await supabase
            .from("orders")
            .update({
                duitku_reference: result.reference,
                duitku_payment_url: result.paymentUrl,
                payment_method: body.paymentMethod,
                payment_status: 'pending',
            })
            .eq("id", id);

        if (updateError) {
            console.error("Failed to update order with Duitku reference:", updateError);
        }

        return new Response(JSON.stringify({
            paymentUrl: result.paymentUrl,
            reference: result.reference,
            vaNumber: result.vaNumber || null,
            qrString: result.qrString || null,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("Duitku transaction request failed:", err);
        return new Response(JSON.stringify({ error: err.message || "Payment request failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
