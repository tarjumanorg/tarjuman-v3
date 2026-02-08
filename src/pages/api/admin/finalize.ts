
import type { APIRoute } from 'astro';
import { createClient } from "../../../lib/supabase";

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

    // Save to `order_files`
    const { error: dbError } = await supabase
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
    await supabase
        .from("orders")
        .update({
            status: "completed",
            // completed_at: new Date().toISOString() // if column exists
        })
        .eq("id", orderId);

    return redirect(`/admin/orders/${orderId}`);
};
