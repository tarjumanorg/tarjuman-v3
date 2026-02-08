
import type { APIRoute } from 'astro';
import { createClient } from "../../../lib/supabase";

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

    // Public URL? Or Signed URL? For now, we assume user can access via logged-in check.
    // We just need to track the file in `order_files` or a separate column?
    // Let's use `order_files` table with type 'watermarked'.

    const { error: dbError } = await supabase
        .from("order_files")
        .insert({
            order_id: orderId,
            file_path: filePath,
            file_type: "watermarked",
            page_count: 0 // Draft count not strictly needed
        });

    if (dbError) return new Response(dbError.message, { status: 500 });

    // Update Order Status to 'review'
    await supabase
        .from("orders")
        .update({ status: "review" })
        .eq("id", orderId);

    return redirect(`/admin/orders/${orderId}`);
};
