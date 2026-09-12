
import type { APIRoute } from "astro";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../../../../lib/supabase";
import { SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";

const BUCKET_BY_FILE_TYPE: Record<string, string> = {
    source: "uploads",
    watermarked: "watermarked",
    final: "finals",
};

export const GET: APIRoute = async (context) => {
    const { url } = context;
    const path = url.searchParams.get("path");
    if (!path) return new Response("Missing path", { status: 400 });

    const supabase = createClient(context);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    if (!SUPABASE_SERVICE_ROLE_KEY) {
        return new Response("Server configuration error", { status: 500 });
    }
    const adminSupabase = createSupabaseClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
    );

    const { data: fileRow, error: fileError } = await adminSupabase
        .from("order_files")
        .select("file_type")
        .eq("file_path", path)
        .single();

    if (fileError || !fileRow) return new Response("File not found", { status: 404 });

    const bucket = BUCKET_BY_FILE_TYPE[fileRow.file_type ?? ""];
    if (!bucket) return new Response("Unknown file type", { status: 500 });

    const { data: signed, error: signError } = await adminSupabase.storage
        .from(bucket)
        .createSignedUrl(path, 60);

    if (signError || !signed) return new Response("Failed to generate download link", { status: 500 });

    return Response.redirect(signed.signedUrl, 302);
};
