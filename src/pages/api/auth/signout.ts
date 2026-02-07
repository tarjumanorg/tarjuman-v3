import type { APIRoute } from "astro";
import { createAstroSupabase } from "../../../lib/supabase";

export const POST: APIRoute = async (context) => {
    const supabase = createAstroSupabase(context);
    const { error } = await supabase.auth.signOut();

    if (error) {
        return new Response(error.message, { status: 500 });
    }

    return context.redirect("/");
};
