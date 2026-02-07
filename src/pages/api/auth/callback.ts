import { createAstroSupabase } from "../../../lib/supabase";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
    const { url, redirect } = context;
    const authCode = url.searchParams.get("code");
    const next = url.searchParams.get("next") || "/dashboard";

    if (!authCode) {
        return new Response("No code provided", { status: 400 });
    }

    const supabase = createAstroSupabase(context);
    const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

    if (error) {
        console.error("Auth error:", error);
        return redirect("/login?error=auth_failed");
    }

    console.log("Session exchanged successfully for user:", data.session?.user.email);
    return redirect(next);
};
