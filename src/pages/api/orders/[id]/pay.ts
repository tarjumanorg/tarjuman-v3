
import type { APIRoute } from "astro";
import { createClient } from "../../../../lib/supabase";

export const POST: APIRoute = async ({ request, params, cookies, redirect }) => {
    const { id } = params;
    const supabase = createClient({ request, cookies, redirect } as any);

    if (!id) {
        return new Response(JSON.stringify({ error: "Order ID is required" }), {
            status: 400,
        });
    }

    // 1. Check Auth
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
        });
    }

    // 2. Mock Payment Success Logic
    // In real world, we verify payment token from gateway here.
    // For mock, we just move status to 'processing'.

    const { data: order, error } = await supabase
        .from("orders")
        .select("user_id")
        .eq("id", id)
        .single();

    if (!order || error) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
            status: 404,
        });
    }

    if (order.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 403,
        });
    }

    const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "processing" })
        .eq("id", id);

    if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
        });
    }

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
    });
};
