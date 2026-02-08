
import type { APIRoute } from "astro";
import { createClient } from "../../../lib/supabase";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    const supabase = createClient({ request, cookies, redirect } as any);

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

    // 2. Parse Body
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const { files, urgencyDays, hardCopy, hardCopyAddress, totalPrice } = body;

    if (!files || files.length === 0) {
        return new Response(JSON.stringify({ error: "No files provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    // 3. Create Order
    // Assuming 'orders' table exists with these fields. 
    // We need to check the schema or fit current schema.
    // Based on Task 2 (Schema), we have 'orders' table.

    // Need to get profile_id? Or just user_id linking?
    // Usually orders.user_id references auth.users or public.profiles.

    const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
            user_id: user.id,
            status: "payment_pending", // Initial status
            final_price: totalPrice,
            urgency_days: urgencyDays,
            physical_copy: hardCopy,
            hard_copy_address: hardCopy ? hardCopyAddress : null,
            page_count_estimated: files.reduce((acc: number, f: any) => acc + f.pageCount, 0),
        })
        .select()
        .single();

    if (orderError) {
        console.error("Order creation error:", orderError);
        return new Response(JSON.stringify({ error: orderError.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    // 4. Create Order Files
    // files array should contain { name, size, pageCount, path (in storage) }
    const fileInserts = files.map((f: any) => ({
        order_id: orderData.id,
        file_path: f.path, // Path in Supabase Storage
        page_count: f.pageCount,
    }));

    const { error: filesError } = await supabase
        .from("order_files")
        .insert(fileInserts);

    if (filesError) {
        console.error("Order files creation error:", filesError);
        // Ideally revert order here, but for now just error
        return new Response(JSON.stringify({ error: filesError.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ order: orderData }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
