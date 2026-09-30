
import type { APIRoute } from "astro";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../../../../lib/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";

export const prerender = false;

// Customers may only download translator output, never the source uploads.
const BUCKET_BY_FILE_TYPE: Record<string, string> = {
    draft: "watermarked",
    final: "finals",
};

export const GET: APIRoute = async ({ request, params, cookies, redirect, url }) => {
    const { id } = params;
    const fileId = url.searchParams.get("file");
    if (!id || !fileId) return new Response("Missing data", { status: 400 });

    const supabase = createClient({ request, cookies, redirect } as any);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { data: order } = await supabase
        .from("orders")
        .select("user_id, status")
        .eq("id", id)
        .single();

    if (!order || order.user_id !== user.id) return new Response("File not found", { status: 404 });

    const { data: fileRow } = await supabase
        .from("order_files")
        .select("file_path, file_type")
        .eq("id", fileId)
        .eq("order_id", id)
        .single();

    if (!fileRow) return new Response("File not found", { status: 404 });

    const bucket = BUCKET_BY_FILE_TYPE[fileRow.file_type ?? ""];
    if (!bucket) return new Response("File not found", { status: 404 });

    // Final translation is released only once the order is completed.
    if (fileRow.file_type === "final" && order.status !== "completed") {
        return new Response("File not found", { status: 404 });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
        return new Response("Server configuration error", { status: 500 });
    }
    const adminSupabase = createSupabaseClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data: signed, error: signError } = await adminSupabase.storage
        .from(bucket)
        .createSignedUrl(fileRow.file_path, 60);

    if (signError || !signed) return new Response("Failed to generate download link", { status: 500 });

    return Response.redirect(signed.signedUrl, 302);
};
