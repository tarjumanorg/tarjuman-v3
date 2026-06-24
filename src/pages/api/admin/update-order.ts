
import type { APIRoute } from 'astro';
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../../../lib/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";

export const POST: APIRoute = async (context) => {
    const { request, redirect } = context;
    const formData = await request.formData();
    const orderId = formData.get("orderId")?.toString();
    const pageCount = Number(formData.get("pageCount"));
    const finalPrice = Number(formData.get("finalPrice"));

    const supabase = createClient(context);

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    // Update logic: Update page count and price.
    // Also, if status was payment_pending, changing price might require user confirmation? 
    // For now, we assume this is the final price adjustment.

    if (!SUPABASE_SERVICE_ROLE_KEY) {
        return new Response("Server configuration error", { status: 500 });
    }
    const adminSupabase = createSupabaseClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
    );

    const { error } = await adminSupabase
        .from("orders")
        .update({
            page_count_total: pageCount,
            final_price: finalPrice,
            // Optional: layout_status: 'verified'
        })
        .eq("id", orderId);

    if (error) return new Response(error.message, { status: 500 });

    return redirect(`/admin/orders/${orderId}`);
};
