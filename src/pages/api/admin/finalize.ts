
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
    const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update({
            status: "completed",
            // completed_at: new Date().toISOString() // if column exists
        })
        .eq("id", orderId)
        .select(`
            id,
            profiles (
                email,
                full_name
            )
        `)
        .single();

    if (updateError) return new Response(updateError.message, { status: 500 });

    // Send 'Completed' email
    try {
        const userEmail = (updatedOrder?.profiles as any)?.email;
        const userName = (updatedOrder?.profiles as any)?.full_name || "User";

        if (userEmail) {
            const { sendEmail } = await import("../../../lib/sendpulse");
            await sendEmail({
                to: userEmail,
                toName: userName,
                subject: "Your translation order is complete!",
                html: `
                    <h2>Translation Complete</h2>
                    <p>Hi ${userName},</p>
                    <p>Great news! The final files for your translation order (Order ID: <b>${updatedOrder.id}</b>) have been uploaded.</p>
                    <p>Your order is now complete. Please log in to your dashboard to download your translated documents.</p>
                    <p>Thank you for using Tarjuman.</p>
                    <br/>
                    <p>Best regards,<br/>The Tarjuman Team</p>
                `
            });
        }
    } catch (e) {
        console.error("[Email] Failed to send complete email:", e);
    }

    return redirect(`/admin/orders/${orderId}`);
};
