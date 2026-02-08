import type { APIRoute } from "astro";
import { createClient } from "../../../lib/supabase";

export const GET: APIRoute = async (context) => {
    const { searchParams } = new URL(context.request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") || "/dashboard";

    if (!code) {
        return new Response("No code provided", { status: 400 });
    }

    const supabase = createClient(context);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return context.redirect(next);
};
