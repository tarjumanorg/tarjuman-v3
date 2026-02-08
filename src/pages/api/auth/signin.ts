import type { APIRoute } from "astro";
import { createClient } from "../../../lib/supabase";

export const GET: APIRoute = async (context) => {
    const supabase = createClient(context);
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: import.meta.env.DEV
                ? "http://localhost:4321/api/auth/callback"
                : "https://tarjuman.org/api/auth/callback",
        },
    });

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return context.redirect(data.url);
};
