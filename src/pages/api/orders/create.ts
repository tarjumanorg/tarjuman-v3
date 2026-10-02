
import type { APIRoute } from "astro";
import { createClient } from "../../../lib/supabase";
import { PRICING_TIERS, computeOrderPrice } from "../../../lib/pricing";

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

    // The client's price is ignored: the amount charged is always recomputed here.
    const { files, urgencyDays, hardCopy, hardCopyAddress } = body ?? {};

    const fail = (status: number, error: string) =>
        new Response(JSON.stringify({ error }), {
            status,
            headers: { "Content-Type": "application/json" },
        });

    if (!Array.isArray(files) || files.length === 0) {
        return fail(400, "No files provided");
    }

    const validFiles = files.every(
        (f: any) =>
            typeof f?.path === "string" &&
            f.path.startsWith(`${user.id}/`) &&
            Number.isInteger(f.pageCount) &&
            f.pageCount >= 1 &&
            f.pageCount <= 500,
    );
    if (!validFiles) {
        return fail(400, "Invalid files");
    }

    const tier = PRICING_TIERS.find((t) => t.days === urgencyDays);
    if (!tier || !tier.open) {
        return fail(400, "Paket pengerjaan ini sedang ditutup. Pilih paket lain.");
    }

    const wantsHardCopy = hardCopy === true;
    if (wantsHardCopy && !(typeof hardCopyAddress === "string" && hardCopyAddress.trim())) {
        return fail(400, "Alamat pengiriman hard copy wajib diisi.");
    }

    const totalPages = files.reduce((acc: number, f: any) => acc + f.pageCount, 0);
    const finalPrice = computeOrderPrice(totalPages, tier.days, wantsHardCopy);

    // 3. Create Order
    const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
            user_id: user.id,
            status: "payment_pending", // Initial status
            original_price: finalPrice,
            final_price: finalPrice,
            urgency_days: tier.days,
            physical_copy: wantsHardCopy,
            hard_copy_address: wantsHardCopy ? hardCopyAddress.trim() : null,
            page_count_estimated: totalPages,
        })
        .select()
        .single();

    if (orderError) {
        console.error("Order creation error:", orderError);
        // Not 500: Cloudflare replaces 500/502/504 bodies with HTML (see pay.ts).
        return fail(400, "Gagal membuat pesanan. Coba lagi.");
    }

    // 4. Create Order Files
    // files array should contain { name, size, pageCount, path (in storage) }
    const fileInserts = files.map((f: any) => ({
        order_id: orderData.id,
        file_path: f.path, // Path in Supabase Storage
        page_count: f.pageCount,
        file_type: "source",
    }));

    const { error: filesError } = await supabase
        .from("order_files")
        .insert(fileInserts);

    if (filesError) {
        console.error("Order files creation error:", filesError);
        // Ideally revert order here, but for now just error
        return fail(400, "Gagal menyimpan dokumen. Coba lagi.");
    }

    return new Response(JSON.stringify({ order: orderData }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
