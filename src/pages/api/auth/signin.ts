import type { APIRoute } from "astro";
import { createAstroSupabase } from "../../../lib/supabase";
import type { Provider } from "@supabase/supabase-js";

export const POST: APIRoute = async (context) => {
    const { request, redirect } = context;

    // Debug log
    console.log("Signin request Content-Type:", request.headers.get("Content-Type"));

    const formData = await request.formData();
    const provider = formData.get("provider")?.toString();

    if (provider) {
        const supabase = createAstroSupabase(context);
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider as Provider,
            options: {
                redirectTo: import.meta.env.DEV
                    ? "http://localhost:4321/api/auth/callback"
                    : "https://tarjuman.org/api/auth/callback",
            },
        });

        if (error) {
            return new Response(error.message, { status: 500 });
        }

        return redirect(data.url);
    }

    return redirect("/login");
};
