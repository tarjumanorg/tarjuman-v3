
import type { APIRoute } from "astro";
import { createAstroSupabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
    const supabase = createAstroSupabase({ request, cookies, redirect } as any);

    // Auth & Admin Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return new Response("Forbidden", { status: 403 });
    }

    const formData = await request.formData();
    const orderId = formData.get("order_id")?.toString();
    const status = formData.get("status")?.toString();
    const pageCount = formData.get("page_count_estimated")?.toString();
    const finalPrice = formData.get("final_price")?.toString();

    if (!orderId) {
        return new Response("Order ID required", { status: 400 });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (pageCount) updates.page_count_estimated = parseInt(pageCount);
    if (finalPrice) updates.final_price = parseInt(finalPrice.replace(/[^0-9]/g, ''));

    const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId);

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return redirect(`/admin/orders/${orderId}`);
};
