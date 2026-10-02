
import type { APIRoute } from 'astro';
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../../../lib/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import { sendOrderEmailById } from "../../../lib/email";

export const POST: APIRoute = async (context) => {
    const { request, redirect } = context;
    const formData = await request.formData();
    const orderId = formData.get("orderId")?.toString();
    const file = formData.get("finalFile") as File;

    const supabase = createClient(context);

    if (!orderId || !file) return new Response("Missing data", { status: 400 });

    // Upload to 'finals' bucket
    const filePath = `${orderId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from("finals")
        .upload(filePath, file, { upsert: true });

    if (uploadError) return new Response(uploadError.message, { status: 500 });

    // order_files is written with the service role only; /api/admin is admin-gated by middleware.
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        return new Response("Server configuration error", { status: 500 });
    }
    const adminSupabase = createSupabaseClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
    );

    // Save to `order_files`
    const { error: dbError } = await adminSupabase
        .from("order_files")
        .insert({
            order_id: orderId,
            file_path: filePath,
            file_type: "final",
            page_count: 0
        });

    if (dbError) return new Response(dbError.message, { status: 500 });

    // Update Order Status to 'completed'
    // Also store completed_at
    const { error: updateError } = await adminSupabase
        .from("orders")
        .update({
            status: "completed",
            // completed_at: new Date().toISOString() // if column exists
        })
        .eq("id", orderId)
        .select("id")
        .single();

    if (updateError) return new Response(updateError.message, { status: 500 });

    // Send 'Completed' email
    await sendOrderEmailById(adminSupabase, "orderComplete", orderId);

    return redirect(`/admin/orders/${orderId}`);
};
