import type { APIRoute } from "astro";
import { createClient } from "../../../lib/supabase";

export const GET: APIRoute = async (context) => {
    const supabase = createClient(context);
    const { searchParams } = new URL(context.request.url);
    const redirectParam = searchParams.get("redirect");

    let callbackUrl = import.meta.env.DEV
        ? "http://localhost:4321/api/auth/callback"
        : "https://tarjuman.org/api/auth/callback";

    if (redirectParam) {
        callbackUrl += `?next=${encodeURIComponent(redirectParam)}`;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: callbackUrl,
        },
    });

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return context.redirect(data.url);
};
