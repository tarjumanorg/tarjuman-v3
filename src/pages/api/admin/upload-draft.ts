
import type { APIRoute } from 'astro';
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../../../lib/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import { sendOrderEmailById } from "../../../lib/email";

export const POST: APIRoute = async (context) => {
    const { request, redirect } = context;
    const formData = await request.formData();
    const orderId = formData.get("orderId")?.toString();
    const file = formData.get("draftFile") as File;

    const supabase = createClient(context);

    if (!orderId || !file) return new Response("Missing data", { status: 400 });

    // Upload to 'watermarked' bucket
    const filePath = `${orderId}/${file.name}`; // e.g. "order_123/Draft.pdf"
    const { error: uploadError } = await supabase.storage
        .from("watermarked")
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

    // Public URL? Or Signed URL? For now, we assume user can access via logged-in check.
    // We just need to track the file in `order_files` or a separate column?
    // Let's use `order_files` table with type 'draft'.

    const { error: dbError } = await adminSupabase
        .from("order_files")
        .insert({
            order_id: orderId,
            file_path: filePath,
            file_type: "draft",
            page_count: 0 // Draft count not strictly needed
        });

    if (dbError) return new Response(dbError.message, { status: 500 });

    // Update Order Status to 'review'
    const { error: updateError } = await adminSupabase
        .from("orders")
        .update({ status: "review" })
        .eq("id", orderId)
        .select("id")
        .single();

    if (updateError) return new Response(updateError.message, { status: 500 });

    // Send 'Review' email
    await sendOrderEmailById(adminSupabase, "draftReady", orderId);

    return redirect(`/admin/orders/${orderId}`);
};
